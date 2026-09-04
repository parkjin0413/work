import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    createTemplate: vi.fn(),
    renameTemplate: vi.fn(),
    archiveTemplate: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    setTaskCompletion: vi.fn(),
    deleteTask: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/tasks/tasksStore", () => storeMock);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createTemplateAction,
  renameTemplateAction,
  archiveTemplateAction,
  createTaskAction,
  updateTaskAction,
  setTaskCompletionAction,
  deleteTaskAction,
} from "./actions";

function resetAll() {
  requireAdminMock.mockReset();
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
  requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
}

describe("createTemplateAction", () => {
  beforeEach(resetAll);

  it("requireAdmin이 실패하면 createTemplate를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(createTemplateAction("업무일지 제출", 3)).rejects.toThrow();
    expect(storeMock.createTemplate).not.toHaveBeenCalled();
  });

  it("빈 이름은 거부한다", async () => {
    await expect(createTemplateAction("  ", 3)).rejects.toThrow("업무 이름을 입력해주세요.");
    expect(storeMock.createTemplate).not.toHaveBeenCalled();
  });

  it("범위를 벗어난 요일은 거부한다", async () => {
    await expect(createTemplateAction("업무일지 제출", 7)).rejects.toThrow("요일이 올바르지 않습니다.");
    await expect(createTemplateAction("업무일지 제출", -1)).rejects.toThrow("요일이 올바르지 않습니다.");
    expect(storeMock.createTemplate).not.toHaveBeenCalled();
  });

  it("정상 생성은 createTemplate와 revalidatePath를 호출한다", async () => {
    storeMock.createTemplate.mockResolvedValue(undefined);
    await createTemplateAction("업무일지 제출", 3);
    expect(storeMock.createTemplate).toHaveBeenCalledWith("업무일지 제출", 3);
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});

describe("renameTemplateAction", () => {
  beforeEach(resetAll);

  it("정상 변경은 renameTemplate와 revalidatePath를 호출한다", async () => {
    storeMock.renameTemplate.mockResolvedValue(undefined);
    await renameTemplateAction("tpl-1", "새 이름", 5);
    expect(storeMock.renameTemplate).toHaveBeenCalledWith("tpl-1", "새 이름", 5);
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});

describe("archiveTemplateAction", () => {
  beforeEach(resetAll);

  it("정상 보관은 archiveTemplate와 revalidatePath를 호출한다", async () => {
    storeMock.archiveTemplate.mockResolvedValue(undefined);
    await archiveTemplateAction("tpl-1");
    expect(storeMock.archiveTemplate).toHaveBeenCalledWith("tpl-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});

describe("createTaskAction", () => {
  beforeEach(resetAll);

  it("빈 이름은 거부한다", async () => {
    await expect(
      createTaskAction({ name: "  ", memo: "", taskDate: "2026-09-04" })
    ).rejects.toThrow("업무 이름을 입력해주세요.");
    expect(storeMock.createTask).not.toHaveBeenCalled();
  });

  it("날짜 형식이 잘못되면 거부한다", async () => {
    await expect(
      createTaskAction({ name: "디자인 시안", memo: "", taskDate: "2026/09/04" })
    ).rejects.toThrow("날짜가 올바르지 않습니다.");
    expect(storeMock.createTask).not.toHaveBeenCalled();
  });

  it("메모가 빈 문자열이면 null로 넘긴다", async () => {
    storeMock.createTask.mockResolvedValue(undefined);
    await createTaskAction({ name: "디자인 시안", memo: "   ", taskDate: "2026-09-04" });
    expect(storeMock.createTask).toHaveBeenCalledWith({
      name: "디자인 시안",
      memo: null,
      taskDate: "2026-09-04",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });

  it("메모가 있으면 그대로 넘긴다", async () => {
    storeMock.createTask.mockResolvedValue(undefined);
    await createTaskAction({ name: "디자인 시안", memo: "1차 진행중", taskDate: "2026-09-04" });
    expect(storeMock.createTask).toHaveBeenCalledWith({
      name: "디자인 시안",
      memo: "1차 진행중",
      taskDate: "2026-09-04",
    });
  });
});

describe("updateTaskAction", () => {
  beforeEach(resetAll);

  it("날짜 형식이 잘못되면 거부한다", async () => {
    await expect(
      updateTaskAction({ id: "task-1", name: "새 이름", memo: "", taskDate: "잘못된 날짜" })
    ).rejects.toThrow("날짜가 올바르지 않습니다.");
    expect(storeMock.updateTask).not.toHaveBeenCalled();
  });

  it("정상 수정은 updateTask와 revalidatePath를 호출한다", async () => {
    storeMock.updateTask.mockResolvedValue(undefined);
    await updateTaskAction({ id: "task-1", name: "새 이름", memo: "2차 진행중", taskDate: "2026-09-05" });
    expect(storeMock.updateTask).toHaveBeenCalledWith("task-1", {
      name: "새 이름",
      memo: "2차 진행중",
      taskDate: "2026-09-05",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});

describe("setTaskCompletionAction", () => {
  beforeEach(resetAll);

  it("requireAdmin이 실패하면 setTaskCompletion을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(setTaskCompletionAction("task-1", true)).rejects.toThrow();
    expect(storeMock.setTaskCompletion).not.toHaveBeenCalled();
  });

  it("정상 처리는 setTaskCompletion과 revalidatePath를 호출한다", async () => {
    storeMock.setTaskCompletion.mockResolvedValue(undefined);
    await setTaskCompletionAction("task-1", true);
    expect(storeMock.setTaskCompletion).toHaveBeenCalledWith("task-1", true);
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});

describe("deleteTaskAction", () => {
  beforeEach(resetAll);

  it("정상 삭제는 deleteTask와 revalidatePath를 호출한다", async () => {
    storeMock.deleteTask.mockResolvedValue(undefined);
    await deleteTaskAction("task-1");
    expect(storeMock.deleteTask).toHaveBeenCalledWith("task-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });
});
