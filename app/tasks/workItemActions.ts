"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createWorkItem,
  deleteWorkItem,
  moveWorkItems,
  updateWorkItem,
  type WorkItem,
  type WorkItemPatch,
  type WorkItemStatus,
} from "@/lib/tasks/workItems";

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("날짜가 올바르지 않습니다.");
  }
}

function assertStatus(value: string): asserts value is WorkItemStatus {
  if (value !== "planned" && value !== "done") throw new Error("상태가 올바르지 않습니다.");
}

function cleanBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("내용을 입력해주세요.");
  return trimmed;
}

export async function createWorkItemAction(input: {
  date: string;
  body: string;
  status: WorkItemStatus;
  projectId: string | null;
  scheduleId?: string | null;
}): Promise<WorkItem> {
  await requireAdmin();
  assertDate(input.date);
  assertStatus(input.status);

  const item = await createWorkItem({
    date: input.date,
    body: cleanBody(input.body),
    status: input.status,
    projectId: input.projectId || null,
    scheduleId: input.scheduleId || null,
  });
  revalidatePath("/tasks");
  return item;
}

export async function updateWorkItemAction(id: string, patch: WorkItemPatch): Promise<void> {
  await requireAdmin();

  const clean: WorkItemPatch = {};
  if (patch.date === null) {
    // 날짜를 비우면 프로젝트의 "남은 단계"로 돌아간다 — 아직 안 한 일이므로 계획 상태.
    clean.date = null;
    clean.status = "planned";
  } else if (patch.date !== undefined) {
    assertDate(patch.date);
    clean.date = patch.date;
  }
  if (patch.body !== undefined) clean.body = cleanBody(patch.body);
  if (patch.status !== undefined) {
    assertStatus(patch.status);
    clean.status = patch.status;
  }
  if (patch.projectId !== undefined) clean.projectId = patch.projectId || null;

  await updateWorkItem(id, clean);
  revalidatePath("/tasks");
}

export async function moveWorkItemsAction(ids: string[], date: string): Promise<void> {
  await requireAdmin();
  assertDate(date);

  await moveWorkItems(ids, date);
  revalidatePath("/tasks");
}

export async function deleteWorkItemAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteWorkItem(id);
  revalidatePath("/tasks");
}
