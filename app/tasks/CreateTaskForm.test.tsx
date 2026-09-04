import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateTaskForm } from "./CreateTaskForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createTaskActionMock } = vi.hoisted(() => ({
  createTaskActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createTaskAction: createTaskActionMock,
}));

describe("CreateTaskForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createTaskActionMock.mockReset();
  });

  it("이름, 날짜, 진행상황을 입력하고 추가하면 createTaskAction을 호출한다", async () => {
    createTaskActionMock.mockResolvedValue(undefined);
    render(<CreateTaskForm />);

    fireEvent.change(screen.getByLabelText("할 일 이름"), { target: { value: "디자인 시안 검토" } });
    fireEvent.change(screen.getByLabelText("진행상황"), { target: { value: "1차 컨펌 대기" } });
    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-04" } });
    fireEvent.click(screen.getByRole("button", { name: "+ 할 일 추가" }));

    await waitFor(() =>
      expect(createTaskActionMock).toHaveBeenCalledWith({
        name: "디자인 시안 검토",
        memo: "1차 컨펌 대기",
        taskDate: "2026-09-04",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("날짜 입력의 기본값은 오늘 날짜다", () => {
    render(<CreateTaskForm />);

    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate()
    ).padStart(2, "0")}`;

    expect(screen.getByLabelText("날짜")).toHaveValue(expected);
  });

  it("이름이 비어있으면 버튼이 비활성화된다", () => {
    render(<CreateTaskForm />);

    expect(screen.getByRole("button", { name: "+ 할 일 추가" })).toBeDisabled();
  });

  it("생성이 실패하면 에러 메시지를 보여준다", async () => {
    createTaskActionMock.mockRejectedValue(new Error("failed"));
    render(<CreateTaskForm />);

    fireEvent.change(screen.getByLabelText("할 일 이름"), { target: { value: "디자인 시안 검토" } });
    fireEvent.click(screen.getByRole("button", { name: "+ 할 일 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("할 일 추가에 실패했습니다.");
  });
});
