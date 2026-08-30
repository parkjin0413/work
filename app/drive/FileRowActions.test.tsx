import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileRowActions } from "./FileRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameFileActionMock, trashFileActionMock } = vi.hoisted(() => ({
  renameFileActionMock: vi.fn(),
  trashFileActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameFileAction: renameFileActionMock,
  trashFileAction: trashFileActionMock,
}));

describe("FileRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameFileActionMock.mockReset();
    trashFileActionMock.mockReset();
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 액션을 호출한다", async () => {
    renameFileActionMock.mockResolvedValue(undefined);

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 이름") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "새이름.txt" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameFileActionMock).toHaveBeenCalledWith("file-1", "새이름.txt")
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("이름 변경에 실패하면 한글 에러 메시지를 보여준다", async () => {
    renameFileActionMock.mockRejectedValue(new Error("rename failed"));

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이름 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  });

  it("삭제 버튼을 누르면 삭제 액션을 호출한다", async () => {
    trashFileActionMock.mockResolvedValue(undefined);

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(trashFileActionMock).toHaveBeenCalledWith("file-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제에 실패하면 한글 에러 메시지를 보여주고 버튼을 다시 활성화한다", async () => {
    trashFileActionMock.mockRejectedValue(new Error("delete failed"));

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
    expect(screen.getByRole("button", { name: "삭제" })).not.toBeDisabled();
  });
});
