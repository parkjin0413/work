import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FavoriteRowActions } from "./FavoriteRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameFavoriteActionMock, deleteFavoriteActionMock } = vi.hoisted(() => ({
  renameFavoriteActionMock: vi.fn(),
  deleteFavoriteActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameFavoriteAction: renameFavoriteActionMock,
  deleteFavoriteAction: deleteFavoriteActionMock,
}));

describe("FavoriteRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameFavoriteActionMock.mockReset();
    deleteFavoriteActionMock.mockReset();
  });

  it("수정 버튼을 누르면 입력창이 나타나고 저장하면 이름과 URL을 변경한다", async () => {
    renameFavoriteActionMock.mockResolvedValue(undefined);
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("새 이름"), { target: { value: "새 위키" } });
    fireEvent.change(screen.getByLabelText("새 URL"), {
      target: { value: "https://new-wiki.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameFavoriteActionMock).toHaveBeenCalledWith({
        id: "fav-1",
        name: "새 위키",
        url: "https://new-wiki.example.com",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("수정에 실패하면 URL 형식 에러 메시지를 보여준다", async () => {
    renameFavoriteActionMock.mockRejectedValue(new Error("failed"));
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)"
    );
  });

  it("삭제 버튼을 누르면 즐겨찾기를 삭제한다", async () => {
    deleteFavoriteActionMock.mockResolvedValue(undefined);
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteFavoriteActionMock).toHaveBeenCalledWith("fav-1"));
    expect(refreshMock).toHaveBeenCalled();
  });
});
