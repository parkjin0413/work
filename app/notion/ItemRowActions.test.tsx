import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ItemRowActions } from "./ItemRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameItemActionMock } = vi.hoisted(() => ({
  renameItemActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameItemAction: renameItemActionMock,
}));

describe("ItemRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameItemActionMock.mockReset();
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 액션을 호출한다", async () => {
    renameItemActionMock.mockResolvedValue(undefined);

    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 제목") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "수정된 제목" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameItemActionMock).toHaveBeenCalledWith({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "수정된 제목",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("빈 제목으로는 저장 버튼이 비활성화된다", () => {
    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 제목") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("이름 변경에 실패하면 한글 에러 메시지를 보여준다", async () => {
    renameItemActionMock.mockRejectedValue(new Error("rename failed"));

    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이름 변경에 실패했습니다. NOTION_API_KEY 값을 확인해주세요."
    );
  });
});
