import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateCategoryForm } from "./CreateCategoryForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createCategoryActionMock } = vi.hoisted(() => ({
  createCategoryActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createCategoryAction: createCategoryActionMock,
}));

describe("CreateCategoryForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createCategoryActionMock.mockReset();
  });

  it("이름을 입력하고 제출하면 카테고리를 생성한다", async () => {
    createCategoryActionMock.mockResolvedValue(undefined);
    render(<CreateCategoryForm />);

    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "업무" } });
    fireEvent.click(screen.getByRole("button", { name: "새 카테고리 추가" }));

    await waitFor(() => expect(createCategoryActionMock).toHaveBeenCalledWith("업무"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("생성에 실패하면 한글 에러 메시지를 보여준다", async () => {
    createCategoryActionMock.mockRejectedValue(new Error("failed"));
    render(<CreateCategoryForm />);

    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "업무" } });
    fireEvent.click(screen.getByRole("button", { name: "새 카테고리 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("카테고리 생성에 실패했습니다.");
  });

  it("이름이 비어있으면 제출 버튼이 비활성화된다", () => {
    render(<CreateCategoryForm />);

    expect(screen.getByRole("button", { name: "새 카테고리 추가" })).toBeDisabled();
  });
});
