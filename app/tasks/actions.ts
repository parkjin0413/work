"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createTemplate,
  renameTemplate,
  archiveTemplate,
  createTask,
  updateTask,
  setTaskCompletion,
  deleteTask,
  reorderTasks,
  addTaskNote,
  deleteTaskNote,
  type TaskNote,
} from "@/lib/tasks/tasksStore";

function assertValidWeekday(weekday: number): void {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    throw new Error("요일이 올바르지 않습니다.");
  }
}

function assertValidDate(dateISO: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
    throw new Error("날짜가 올바르지 않습니다.");
  }
}

export async function createTemplateAction(name: string, weekday: number): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("업무 이름을 입력해주세요.");
  }
  assertValidWeekday(weekday);

  await createTemplate(name.trim(), weekday);
  revalidatePath("/tasks");
}

export async function renameTemplateAction(id: string, name: string, weekday: number): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("업무 이름을 입력해주세요.");
  }
  assertValidWeekday(weekday);

  await renameTemplate(id, name.trim(), weekday);
  revalidatePath("/tasks");
}

export async function archiveTemplateAction(id: string): Promise<void> {
  await requireAdmin();

  await archiveTemplate(id);
  revalidatePath("/tasks");
}

export async function createTaskAction(params: { name: string; memo: string; taskDate: string }): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("업무 이름을 입력해주세요.");
  }
  assertValidDate(params.taskDate);

  await createTask({ name: params.name.trim(), memo: params.memo.trim() || null, taskDate: params.taskDate });
  revalidatePath("/tasks");
}

export async function updateTaskAction(params: {
  id: string;
  name: string;
  memo: string;
  taskDate: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("업무 이름을 입력해주세요.");
  }
  assertValidDate(params.taskDate);

  await updateTask(params.id, {
    name: params.name.trim(),
    memo: params.memo.trim() || null,
    taskDate: params.taskDate,
  });
  revalidatePath("/tasks");
}

export async function setTaskCompletionAction(id: string, isCompleted: boolean): Promise<void> {
  await requireAdmin();

  await setTaskCompletion(id, isCompleted);
  revalidatePath("/tasks");
}

export async function deleteTaskAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteTask(id);
  revalidatePath("/tasks");
}

export async function reorderTasksAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  await reorderTasks(orderedIds);
  revalidatePath("/tasks");
}

export async function addTaskNoteAction(taskId: string, body: string): Promise<TaskNote> {
  await requireAdmin();

  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("메모 내용을 입력해주세요.");
  }

  const note = await addTaskNote(taskId, trimmed);
  revalidatePath("/tasks");
  return note;
}

export async function deleteTaskNoteAction(noteId: string): Promise<void> {
  await requireAdmin();

  await deleteTaskNote(noteId);
  revalidatePath("/tasks");
}
