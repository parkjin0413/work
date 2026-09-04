import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskList } from "./TaskList";

const { setTaskCompletionActionMock, deleteTaskActionMock, updateTaskActionMock } = vi.hoisted(() => ({
  setTaskCompletionActionMock: vi.fn(),
  deleteTaskActionMock: vi.fn(),
  updateTaskActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  setTaskCompletionAction: setTaskCompletionActionMock,
  deleteTaskAction: deleteTaskActionMock,
  updateTaskAction: updateTaskActionMock,
}));

const adhocTask = {
  id: "task-adhoc",
  name: "디자인 시안 검토",
  memo: "1차 컨펌 대기",
  taskDate: "2026-09-04",
  isCompleted: false,
  completedAt: null,
  createdAt: "2026-08-10T00:00:00.000Z",
  sortOrder: 1,
};

describe("TaskList", () => {
  beforeEach(() => {
    setTaskCompletionActionMock.mockReset().mockResolvedValue(undefined);
    deleteTaskActionMock.mockReset().mockResolvedValue(undefined);
    updateTaskActionMock.mockReset().mockResolvedValue(undefined);
  });

  it("날짜(월/일/요일)와 진행상황을 카드로 보여준다", () => {
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    expect(screen.getByText("디자인 시안 검토")).toBeInTheDocument();
    expect(screen.getByText("9월 4일 (금)")).toBeInTheDocument();
    expect(screen.getByText("1차 컨펌 대기")).toBeInTheDocument();
  });

  it("진행상황이 없으면 안내 문구를 보여준다", () => {
    render(<TaskList incomplete={[{ ...adhocTask, memo: null }]} completed={[]} />);

    expect(screen.getByText("진행상황 없음")).toBeInTheDocument();
  });

  it("체크하면 완료 섹션으로 이동하고 취소선이 붙는다", async () => {
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "디자인 시안 검토 완료" }));

    await waitFor(() => expect(setTaskCompletionActionMock).toHaveBeenCalledWith("task-adhoc", true));
    expect(screen.getByText("완료됨")).toBeInTheDocument();
    expect(screen.getByText("디자인 시안 검토")).toHaveClass("line-through");
  });

  it("완료 처리가 실패하면 원래 상태로 되돌리고 에러를 보여준다", async () => {
    setTaskCompletionActionMock.mockRejectedValue(new Error("failed"));
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "디자인 시안 검토 완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("완료 처리에 실패했습니다.");
    expect(screen.queryByText("완료됨")).not.toBeInTheDocument();
  });

  it("삭제 버튼을 누르면 deleteTaskAction을 호출하고 목록에서 사라진다", async () => {
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "디자인 시안 검토 삭제" }));

    await waitFor(() => expect(deleteTaskActionMock).toHaveBeenCalledWith("task-adhoc"));
    expect(screen.queryByText("디자인 시안 검토")).not.toBeInTheDocument();
  });

  it("수정 버튼을 누르면 편집 폼이 나오고 저장하면 날짜를 포함해 updateTaskAction을 호출한다", async () => {
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "디자인 시안 검토 수정" }));
    fireEvent.change(screen.getByLabelText("업무 이름"), { target: { value: "디자인 시안 최종본" } });
    fireEvent.change(screen.getByLabelText("날짜"), { target: { value: "2026-09-10" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(updateTaskActionMock).toHaveBeenCalledWith({
        id: "task-adhoc",
        name: "디자인 시안 최종본",
        memo: "1차 컨펌 대기",
        taskDate: "2026-09-10",
      })
    );
    expect(screen.getByText("디자인 시안 최종본")).toBeInTheDocument();
  });
});
