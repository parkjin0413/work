"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  addProjectStep,
  createProject,
  deleteProject,
  setProjectCompleted,
  updateProject,
  type ProjectKind,
  type ProjectStep,
} from "@/lib/tasks/projects";

function assertKind(kind: string): asserts kind is ProjectKind {
  if (kind !== "project" && kind !== "ongoing") throw new Error("종류가 올바르지 않습니다.");
}

function cleanName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("이름을 입력해주세요.");
  return trimmed;
}

export async function createProjectAction(name: string, kind: ProjectKind): Promise<string> {
  await requireAdmin();
  assertKind(kind);

  const id = await createProject(cleanName(name), kind);
  revalidatePath("/tasks");
  return id;
}

export async function updateProjectAction(
  id: string,
  patch: Partial<{ name: string; memo: string; kind: ProjectKind }>
): Promise<void> {
  await requireAdmin();

  const clean: Partial<{ name: string; memo: string | null; kind: ProjectKind }> = {};
  if (patch.name !== undefined) clean.name = cleanName(patch.name);
  if (patch.memo !== undefined) clean.memo = patch.memo.trim() || null;
  if (patch.kind !== undefined) {
    assertKind(patch.kind);
    clean.kind = patch.kind;
  }

  await updateProject(id, clean);
  revalidatePath("/tasks");
}

export async function setProjectCompletedAction(id: string, isCompleted: boolean): Promise<void> {
  await requireAdmin();

  await setProjectCompleted(id, isCompleted);
  revalidatePath("/tasks");
}

export async function deleteProjectAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteProject(id);
  revalidatePath("/tasks");
}

export async function addProjectStepAction(projectId: string, body: string): Promise<ProjectStep> {
  await requireAdmin();

  const trimmed = body.trim();
  if (!trimmed) throw new Error("내용을 입력해주세요.");

  const step = await addProjectStep(projectId, trimmed);
  revalidatePath("/tasks");
  return step;
}
