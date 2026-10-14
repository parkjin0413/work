import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TaskList } from "./TaskList";

const {
  setTaskCompletionActionMock,
  deleteTaskActionMock,
  updateTaskActionMock,
  reorderTasksActionMock,
  addTaskNoteActionMock,
  updateTaskNoteActionMock,
  deleteTaskNoteActionMock,
} = vi.hoisted(() => ({
  setTaskCompletionActionMock: vi.fn(),
  deleteTaskActionMock: vi.fn(),
  updateTaskActionMock: vi.fn(),
  reorderTasksActionMock: vi.fn(),
  addTaskNoteActionMock: vi.fn(),
  updateTaskNoteActionMock: vi.fn(),
  deleteTaskNoteActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  setTaskCompletionAction: setTaskCompletionActionMock,
  deleteTaskAction: deleteTaskActionMock,
  updateTaskAction: updateTaskActionMock,
  reorderTasksAction: reorderTasksActionMock,
  addTaskNoteAction: addTaskNoteActionMock,
  updateTaskNoteAction: updateTaskNoteActionMock,
  deleteTaskNoteAction: deleteTaskNoteActionMock,
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
  notes: [],
};

describe("TaskList", () => {
  beforeEach(() => {
    setTaskCompletionActionMock.mockReset().mockResolvedValue(undefined);
    deleteTaskActionMock.mockReset().mockResolvedValue(undefined);
    updateTaskActionMock.mockReset().mockResolvedValue(undefined);
    reorderTasksActionMock.mockReset().mockResolvedValue(undefined);
    addTaskNoteActionMock.mockReset().mockResolvedValue(undefined);
    updateTaskNoteActionMock.mockReset().mockResolvedValue(undefined);
    deleteTaskNoteActionMock.mockReset().mockResolvedValue(undefined);
  });

  it("미완료 카드에는 순서 변경용 드래그 핸들이 있고, 완료된 카드에는 없다", () => {
    const completedTask = { ...adhocTask, id: "task-done", name: "완료된 업무", isCompleted: true };
    render(<TaskList incomplete={[adhocTask]} completed={[completedTask]} />);

    expect(screen.getByRole("button", { name: "디자인 시안 검토 순서 변경" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "완료된 업무 순서 변경" })
    ).not.toBeInTheDocument();
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

    // 완료됨 섹션은 기본 접힘이라 펼쳐서 확인한다
    const toggle = screen.getByRole("button", { name: /완료됨 1건/ });
    expect(toggle).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.getByText("디자인 시안 검토")).toHaveClass("line-through");
  });

  it("완료 처리가 실패하면 원래 상태로 되돌리고 에러를 보여준다", async () => {
    setTaskCompletionActionMock.mockRejectedValue(new Error("failed"));
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "디자인 시안 검토 완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("완료 처리에 실패했습니다.");
    expect(screen.queryByRole("button", { name: /완료됨/ })).not.toBeInTheDocument();
  });

  it("삭제 버튼을 누르면 deleteTaskAction을 호출하고 목록에서 사라진다", async () => {
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "디자인 시안 검토 삭제" }));

    await waitFor(() => expect(deleteTaskActionMock).toHaveBeenCalledWith("task-adhoc"));
    expect(screen.queryByText("디자인 시안 검토")).not.toBeInTheDocument();
  });

  it("진행 메모를 시간순으로 보여주고, 입력해서 추가하면 addTaskNoteAction을 호출한다", async () => {
    addTaskNoteActionMock.mockResolvedValue({
      id: "n-new",
      body: "샘플 방문 일정 조율",
      createdAt: "2026-09-10T05:00:00.000Z",
    });
    const task = {
      ...adhocTask,
      notes: [{ id: "n1", body: "1차 상담 완료", createdAt: "2026-09-09T01:00:00.000Z" }],
    };
    render(<TaskList incomplete={[task]} completed={[]} />);

    expect(screen.getByText("1차 상담 완료")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("진행 메모 추가"), {
      target: { value: "샘플 방문 일정 조율" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() =>
      expect(addTaskNoteActionMock).toHaveBeenCalledWith("task-adhoc", "샘플 방문 일정 조율")
    );
    expect(await screen.findByText("샘플 방문 일정 조율")).toBeInTheDocument();
  });

  it("방금 추가한 메모가 빠진 옛날 서버 응답이 뒤늦게 와도 메모가 사라지지 않는다", async () => {
    const newNote = { id: "n-new", body: "샘플 방문 일정 조율", createdAt: "2026-09-10T05:00:00.000Z" };
    addTaskNoteActionMock.mockResolvedValue(newNote);
    const { rerender } = render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    fireEvent.change(screen.getByLabelText("진행 메모 추가"), {
      target: { value: "샘플 방문 일정 조율" },
    });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));
    expect(await screen.findByText("샘플 방문 일정 조율")).toBeInTheDocument();

    // 다른 카드의 작업 때문에 메모 추가 이전 시점의 목록이 뒤늦게 내려오는 상황
    rerender(<TaskList incomplete={[{ ...adhocTask, notes: [] }]} completed={[]} />);
    expect(screen.getByText("샘플 방문 일정 조율")).toBeInTheDocument();

    // 서버가 메모를 인지한 응답이 오면 그 뒤로는 서버 데이터를 그대로 따른다
    rerender(<TaskList incomplete={[{ ...adhocTask, notes: [newNote] }]} completed={[]} />);
    expect(screen.getByText("샘플 방문 일정 조율")).toBeInTheDocument();
  });

  it("방금 삭제한 메모가 남아있는 옛날 서버 응답이 와도 다시 살아나지 않는다", async () => {
    const note = { id: "n1", body: "지울 메모", createdAt: "2026-09-09T01:00:00.000Z" };
    const { rerender } = render(
      <TaskList incomplete={[{ ...adhocTask, notes: [note] }]} completed={[]} />
    );

    fireEvent.click(screen.getByRole("button", { name: "진행 메모 삭제" }));
    await waitFor(() => expect(deleteTaskNoteActionMock).toHaveBeenCalledWith("n1"));

    rerender(<TaskList incomplete={[{ ...adhocTask, notes: [note] }]} completed={[]} />);
    expect(screen.queryByText("지울 메모")).not.toBeInTheDocument();
  });

  it("진행 메모 삭제 버튼을 누르면 deleteTaskNoteAction을 호출하고 목록에서 사라진다", async () => {
    const task = {
      ...adhocTask,
      notes: [{ id: "n1", body: "지울 메모", createdAt: "2026-09-09T01:00:00.000Z" }],
    };
    render(<TaskList incomplete={[task]} completed={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "진행 메모 삭제" }));

    await waitFor(() => expect(deleteTaskNoteActionMock).toHaveBeenCalledWith("n1"));
    expect(screen.queryByText("지울 메모")).not.toBeInTheDocument();
  });

  it("메모는 최신순으로 보이고, 3개를 넘으면 나머지는 접어둔다", () => {
    const notes = Array.from({ length: 5 }, (_, i) => ({
      id: `n${i + 1}`,
      body: `메모${i + 1}`,
      createdAt: `2026-09-${String(10 + i).padStart(2, "0")}T01:00:00.000Z`,
    }));
    render(<TaskList incomplete={[{ ...adhocTask, notes }]} completed={[]} />);

    // 최신(메모5)이 보이고 오래된 메모(메모1, 메모2)는 접혀 있다
    expect(screen.getByText("메모5")).toBeInTheDocument();
    expect(screen.getByText("메모3")).toBeInTheDocument();
    expect(screen.queryByText("메모1")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "이전 메모 2개 더 보기" }));
    expect(screen.getByText("메모1")).toBeInTheDocument();
  });

  it("메모 입력창에서 Ctrl+Enter 로 바로 추가된다", async () => {
    addTaskNoteActionMock.mockResolvedValue({
      id: "n-new",
      body: "빠른 메모",
      createdAt: "2026-09-10T05:00:00.000Z",
    });
    render(<TaskList incomplete={[adhocTask]} completed={[]} />);

    const input = screen.getByLabelText("진행 메모 추가");
    fireEvent.change(input, { target: { value: "빠른 메모" } });
    fireEvent.keyDown(input, { key: "Enter", ctrlKey: true });

    await waitFor(() =>
      expect(addTaskNoteActionMock).toHaveBeenCalledWith("task-adhoc", "빠른 메모")
    );
  });

  it("메모를 수정하면 updateTaskNoteAction 을 호출하고 화면에 반영한다", async () => {
    updateTaskNoteActionMock.mockResolvedValue({
      id: "n1",
      body: "고친 메모",
      createdAt: "2026-09-09T01:00:00.000Z",
    });
    const task = {
      ...adhocTask,
      notes: [{ id: "n1", body: "원래 메모", createdAt: "2026-09-09T01:00:00.000Z" }],
    };
    render(<TaskList incomplete={[task]} completed={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "진행 메모 수정" }));
    fireEvent.change(screen.getByLabelText("진행 메모 수정"), { target: { value: "고친 메모" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(updateTaskNoteActionMock).toHaveBeenCalledWith("n1", "고친 메모"));
    expect(await screen.findByText("고친 메모")).toBeInTheDocument();
    expect(screen.queryByText("원래 메모")).not.toBeInTheDocument();
  });

  it("검색어로 업무명과 메모를 함께 거른다", () => {
    const other = {
      ...adhocTask,
      id: "task-other",
      name: "나스 관리",
      memo: null,
      notes: [{ id: "n9", body: "백업 주기 확인", createdAt: "2026-09-09T01:00:00.000Z" }],
    };
    render(<TaskList incomplete={[adhocTask, other]} completed={[]} />);

    fireEvent.change(screen.getByLabelText("업무 검색"), { target: { value: "백업" } });

    expect(screen.getByText("나스 관리")).toBeInTheDocument();
    expect(screen.queryByText("디자인 시안 검토")).not.toBeInTheDocument();
  });

  it("오랫동안 메모가 없으면 카드에 정체 표시를 붙인다", () => {
    const stale = {
      ...adhocTask,
      notes: [{ id: "n1", body: "오래된 메모", createdAt: "2020-01-01T01:00:00.000Z" }],
    };
    render(<TaskList incomplete={[stale]} completed={[]} />);

    expect(screen.getByTitle("최근 진행 메모 1월 1일 (수)")).toHaveTextContent("일째");
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
