import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { GmailMessageSummary } from "@/lib/google/gmailClient";
import { MessageList } from "./MessageList";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { trashMessagesActionMock } = vi.hoisted(() => ({
  trashMessagesActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  trashMessagesAction: trashMessagesActionMock,
}));

const messages = [
  { id: "msg-1", subject: "첫 메일", from: "a@example.com", date: "2026-08-30", snippet: "내용1" },
  { id: "msg-2", subject: "둘째 메일", from: "b@example.com", date: "2026-08-30", snippet: "내용2" },
];

const sentMessages: GmailMessageSummary[] = [
  { id: "msg-9", subject: "보낸 메일", from: "me@example.com", date: "2026-08-31", snippet: "내용9" },
];

describe("MessageList", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    trashMessagesActionMock.mockReset();
  });

  it("전체 선택 체크박스를 누르면 모든 메일이 선택된다", () => {
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("전체 선택"));

    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();
    expect(screen.getByLabelText("첫 메일 선택")).toBeChecked();
    expect(screen.getByLabelText("둘째 메일 선택")).toBeChecked();
  });

  it("선택된 게 없으면 선택 삭제 버튼이 비활성화된다", () => {
    render(<MessageList messages={messages} />);

    expect(screen.getByRole("button", { name: "선택 삭제" })).toBeDisabled();
  });

  it("확인창을 취소하면 삭제 액션을 호출하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    expect(trashMessagesActionMock).not.toHaveBeenCalled();
  });

  it("확인창에서 확인하면 선택된 ID로 삭제 액션을 호출한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    trashMessagesActionMock.mockResolvedValue(undefined);
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    await waitFor(() => expect(trashMessagesActionMock).toHaveBeenCalledWith(["msg-1"]));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제가 실패하면 한글 에러 메시지를 보여준다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    trashMessagesActionMock.mockRejectedValue(new Error("failed"));
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "일부 메일 삭제에 실패했습니다. 목록을 새로고침해서 확인해주세요."
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("메일 제목 링크는 상세 페이지로 연결된다", () => {
    render(<MessageList messages={messages} />);

    expect(screen.getByRole("link", { name: /첫 메일/ })).toHaveAttribute("href", "/gmail/msg-1");
  });

  it("key가 바뀌며 다시 마운트되면 선택 상태가 초기화된다", () => {
    const { rerender } = render(<MessageList key="inbox" messages={messages} />);

    fireEvent.click(screen.getByLabelText("전체 선택"));
    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();
    expect(screen.getByLabelText("첫 메일 선택")).toBeChecked();
    expect(screen.getByLabelText("둘째 메일 선택")).toBeChecked();

    rerender(<MessageList key="sent" messages={sentMessages} />);

    expect(screen.getByText("0개 선택됨")).toBeInTheDocument();
    expect(screen.getByLabelText("보낸 메일 선택")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "선택 삭제" })).toBeDisabled();
  });
});
