import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateItemForm } from "./CreateItemForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createItemActionMock } = vi.hoisted(() => ({
  createItemActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createItemAction: createItemActionMock,
}));

describe("CreateItemForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createItemActionMock.mockReset();
  });

  it("제목을 입력하고 제출하면 생성 액션을 호출한다", async () => {
    createItemActionMock.mockResolvedValue(undefined);

    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    fireEvent.change(screen.getByLabelText("새 항목 제목"), { target: { value: "새 항목" } });
    fireEvent.click(screen.getByRole("button", { name: "새 항목 추가" }));

    await waitFor(() =>
      expect(createItemActionMock).toHaveBeenCalledWith({
        databaseId: "db-1",
        titlePropertyName: "이름",
        title: "새 항목",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("제목이 비어 있으면 추가 버튼이 비활성화된다", () => {
    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    expect(screen.getByRole("button", { name: "새 항목 추가" })).toBeDisabled();
  });

  it("생성에 실패하면 한글 에러 메시지를 보여준다", async () => {
    createItemActionMock.mockRejectedValue(new Error("create failed"));

    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    fireEvent.change(screen.getByLabelText("새 항목 제목"), { target: { value: "새 항목" } });
    fireEvent.click(screen.getByRole("button", { name: "새 항목 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "항목 추가에 실패했습니다. NOTION_API_KEY 값을 확인해주세요."
    );
    expect(screen.getByRole("button", { name: "새 항목 추가" })).not.toBeDisabled();
  });
});
