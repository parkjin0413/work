import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FixedTaskBoard } from "./FixedTaskBoard";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const {
  createTemplateActionMock,
  renameTemplateActionMock,
  archiveTemplateActionMock,
  setTaskCompletionActionMock,
} = vi.hoisted(() => ({
  createTemplateActionMock: vi.fn(),
  renameTemplateActionMock: vi.fn(),
  archiveTemplateActionMock: vi.fn(),
  setTaskCompletionActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createTemplateAction: createTemplateActionMock,
  renameTemplateAction: renameTemplateActionMock,
  archiveTemplateAction: archiveTemplateActionMock,
  setTaskCompletionAction: setTaskCompletionActionMock,
}));

const tasks = [
  { taskId: "task-1", templateId: "tpl-1", name: "주간업무일지 제출", weekday: 3, isCompleted: false },
];

describe("FixedTaskBoard", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createTemplateActionMock.mockReset();
    renameTemplateActionMock.mockReset();
    archiveTemplateActionMock.mockReset();
    setTaskCompletionActionMock.mockReset();
  });

  it("카드 형태로 고정 업무 제목과 요일을 보여준다", () => {
    render(<FixedTaskBoard tasks={tasks} />);

    expect(screen.getByText("주간업무일지 제출")).toBeInTheDocument();
    expect(screen.getByText("목요일")).toBeInTheDocument();
  });

  it("체크박스를 누르면 setTaskCompletionAction을 호출한다", async () => {
    setTaskCompletionActionMock.mockResolvedValue(undefined);
    render(<FixedTaskBoard tasks={tasks} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "주간업무일지 제출 완료" }));

    await waitFor(() =>
      expect(setTaskCompletionActionMock).toHaveBeenCalledWith("task-1", true)
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("+ 고정 업무 추가 버튼으로 새 고정 업무를 만들 수 있다", async () => {
    createTemplateActionMock.mockResolvedValue(undefined);
    render(<FixedTaskBoard tasks={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "+ 고정 업무 추가" }));
    fireEvent.change(screen.getByLabelText("새 고정 업무 이름"), { target: { value: "월요 회의 준비" } });
    fireEvent.change(screen.getByLabelText("새 고정 업무 요일"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "추가" }));

    await waitFor(() => expect(createTemplateActionMock).toHaveBeenCalledWith("월요 회의 준비", 0));
  });

  it("수정 버튼을 누르면 편집 폼이 나오고 저장하면 renameTemplateAction을 호출한다", async () => {
    renameTemplateActionMock.mockResolvedValue(undefined);
    render(<FixedTaskBoard tasks={tasks} />);

    fireEvent.click(screen.getByRole("button", { name: "주간업무일지 제출 수정" }));
    fireEvent.change(screen.getByLabelText("고정 업무 이름"), { target: { value: "새 이름" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(renameTemplateActionMock).toHaveBeenCalledWith("tpl-1", "새 이름", 3));
  });

  it("보관 버튼을 누르면 archiveTemplateAction을 호출한다", async () => {
    archiveTemplateActionMock.mockResolvedValue(undefined);
    render(<FixedTaskBoard tasks={tasks} />);

    fireEvent.click(screen.getByRole("button", { name: "주간업무일지 제출 보관" }));

    await waitFor(() => expect(archiveTemplateActionMock).toHaveBeenCalledWith("tpl-1"));
  });
});
