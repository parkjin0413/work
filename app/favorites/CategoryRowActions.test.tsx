import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryRowActions } from "./CategoryRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameCategoryActionMock, deleteCategoryActionMock } = vi.hoisted(() => ({
  renameCategoryActionMock: vi.fn(),
  deleteCategoryActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameCategoryAction: renameCategoryActionMock,
  deleteCategoryAction: deleteCategoryActionMock,
}));

describe("CategoryRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameCategoryActionMock.mockReset();
    deleteCategoryActionMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 이름을 변경한다", async () => {
    renameCategoryActionMock.mockResolvedValue(undefined);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "새 업무" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(renameCategoryActionMock).toHaveBeenCalledWith("cat-1", "새 업무"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제 버튼을 누르고 확인하면 카테고리를 삭제한다", async () => {
    deleteCategoryActionMock.mockResolvedValue(undefined);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteCategoryActionMock).toHaveBeenCalledWith("cat-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("확인창에서 취소하면 삭제하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(deleteCategoryActionMock).not.toHaveBeenCalled();
  });
});
