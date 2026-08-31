import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateFavoriteForm } from "./CreateFavoriteForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createFavoriteActionMock } = vi.hoisted(() => ({
  createFavoriteActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createFavoriteAction: createFavoriteActionMock,
}));

describe("CreateFavoriteForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createFavoriteActionMock.mockReset();
  });

  it("이름과 URL을 입력하고 제출하면 즐겨찾기를 생성한다", async () => {
    createFavoriteActionMock.mockResolvedValue(undefined);
    render(<CreateFavoriteForm categoryId="cat-1" />);

    fireEvent.change(screen.getByLabelText("새 즐겨찾기 이름"), { target: { value: "사내 위키" } });
    fireEvent.change(screen.getByLabelText("새 즐겨찾기 URL"), {
      target: { value: "https://wiki.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "즐겨찾기 추가" }));

    await waitFor(() =>
      expect(createFavoriteActionMock).toHaveBeenCalledWith({
        categoryId: "cat-1",
        name: "사내 위키",
        url: "https://wiki.example.com",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("생성에 실패하면 URL 형식 에러 메시지를 보여준다", async () => {
    createFavoriteActionMock.mockRejectedValue(new Error("failed"));
    render(<CreateFavoriteForm categoryId="cat-1" />);

    fireEvent.change(screen.getByLabelText("새 즐겨찾기 이름"), { target: { value: "위험" } });
    fireEvent.change(screen.getByLabelText("새 즐겨찾기 URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "즐겨찾기 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)"
    );
  });

  it("이름이나 URL이 비어있으면 제출 버튼이 비활성화된다", () => {
    render(<CreateFavoriteForm categoryId="cat-1" />);

    expect(screen.getByRole("button", { name: "즐겨찾기 추가" })).toBeDisabled();
  });
});
