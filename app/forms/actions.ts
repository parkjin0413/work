"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getKstTodayISO } from "@/lib/tasks/week";
import { parseExpenseFields, parseLeaveFields, readApproverIds } from "@/lib/forms/parse";
import { MAX_EXPENSE_APPROVERS, MAX_LEAVE_APPROVERS } from "@/lib/forms/types";
import { parseStatementFields } from "@/lib/forms/statement";
import {
  createExpenseReport,
  createExpenseStatement,
  deleteExpenseStatement,
  updateExpenseStatement,
  createLeaveRequest,
  deleteExpenseReport,
  deleteLeaveRequest,
  deleteStamp,
  getDrafterProfile,
  resolveApprovers,
  STAMP_MAX_BYTES,
  updateExpenseReport,
  updateLeaveRequest,
  uploadStamp,
} from "@/lib/forms/formsStore";

/** 폼 제출 결과: 성공하면 문서 화면으로 이동하고, 실패하면 문구를 돌려준다. */
export type FormState = { error: string } | null;

async function approversFrom(formData: FormData, max: number) {
  const ids = readApproverIds(formData, max);
  if (!ids.ok) return ids;
  const approvers = await resolveApprovers(ids.value);
  if (!approvers) return { ok: false as const, error: "직원명단에 없는 결재자가 있습니다. 다시 선택해주세요." };
  return { ok: true as const, value: approvers };
}

// redirect() 는 예외로 동작하므로 try 밖에서 부른다.

// ── 품의서 ──────────────────────────────────────────────

export async function createExpenseReportAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = parseExpenseFields(formData);
  if (!fields.ok) return { error: fields.error };

  let id: string;
  try {
    const approvers = await approversFrom(formData, MAX_EXPENSE_APPROVERS);
    if (!approvers.ok) return { error: approvers.error };
    id = await createExpenseReport(await getDrafterProfile(), fields.value, approvers.value);
  } catch (error) {
    console.error("[forms] 품의서 저장 실패:", error);
    return { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/forms");
  redirect(`/forms/expense/${id}`);
}

export async function updateExpenseReportAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = parseExpenseFields(formData);
  if (!fields.ok) return { error: fields.error };

  try {
    const approvers = await approversFrom(formData, MAX_EXPENSE_APPROVERS);
    if (!approvers.ok) return { error: approvers.error };
    await updateExpenseReport(id, fields.value, approvers.value);
  } catch (error) {
    console.error("[forms] 품의서 수정 실패:", error);
    return { error: "수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/forms");
  revalidatePath(`/forms/expense/${id}`);
  redirect(`/forms/expense/${id}`);
}

export async function deleteExpenseReportAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteExpenseReport(id);
  revalidatePath("/forms");
  redirect("/forms");
}

// ── 휴가신청서 ──────────────────────────────────────────

export async function createLeaveRequestAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = parseLeaveFields(formData);
  if (!fields.ok) return { error: fields.error };

  let id: string;
  try {
    const approvers = await approversFrom(formData, MAX_LEAVE_APPROVERS);
    if (!approvers.ok) return { error: approvers.error };
    id = await createLeaveRequest(await getDrafterProfile(), getKstTodayISO(), fields.value, approvers.value);
  } catch (error) {
    console.error("[forms] 휴가신청서 저장 실패:", error);
    return { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/forms");
  redirect(`/forms/leave/${id}`);
}

export async function updateLeaveRequestAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = parseLeaveFields(formData);
  if (!fields.ok) return { error: fields.error };

  try {
    const approvers = await approversFrom(formData, MAX_LEAVE_APPROVERS);
    if (!approvers.ok) return { error: approvers.error };
    await updateLeaveRequest(id, fields.value, approvers.value);
  } catch (error) {
    console.error("[forms] 휴가신청서 수정 실패:", error);
    return { error: "수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/forms");
  revalidatePath(`/forms/leave/${id}`);
  redirect(`/forms/leave/${id}`);
}

export async function deleteLeaveRequestAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteLeaveRequest(id);
  revalidatePath("/forms");
  redirect("/forms");
}

// ── 내 도장 ─────────────────────────────────────────────

export async function uploadStampAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const file = formData.get("stamp");
  if (!(file instanceof File) || file.size === 0) return { error: "도장 이미지 파일을 선택해주세요." };
  if (!file.type.startsWith("image/")) return { error: "이미지 파일(PNG, JPG)만 올릴 수 있습니다." };
  if (file.size > STAMP_MAX_BYTES) return { error: "2MB 이하 이미지만 올릴 수 있습니다." };

  try {
    await uploadStamp(file);
  } catch (error) {
    console.error("[forms] 도장 업로드 실패:", error);
    return { error: "도장을 올리지 못했습니다. 0022_forms.sql 실행 여부를 확인해주세요." };
  }
  revalidatePath("/forms", "layout");
  return null;
}

export async function deleteStampAction(): Promise<void> {
  await requireAdmin();
  await deleteStamp();
  revalidatePath("/forms", "layout");
}

// ── 경비내역서 ──────────────────────────────────────────

export async function createExpenseStatementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const fields = parseStatementFields(formData);
  if (!fields.ok) return { error: fields.error };

  let id: string;
  try {
    id = await createExpenseStatement(await getDrafterProfile(), fields.value);
  } catch (error) {
    console.error("[forms] 경비내역서 저장 실패:", error);
    return { error: "저장 중 오류가 발생했습니다. 0023_expense_statements.sql 실행 여부를 확인해주세요." };
  }

  revalidatePath("/forms");
  redirect(`/forms/statement/${id}`);
}

export async function updateExpenseStatementAction(
  id: string,
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  await requireAdmin();
  const fields = parseStatementFields(formData);
  if (!fields.ok) return { error: fields.error };

  try {
    await updateExpenseStatement(id, fields.value);
  } catch (error) {
    console.error("[forms] 경비내역서 수정 실패:", error);
    return { error: "수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." };
  }

  revalidatePath("/forms");
  revalidatePath(`/forms/statement/${id}`);
  redirect(`/forms/statement/${id}`);
}

export async function deleteExpenseStatementAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteExpenseStatement(id);
  revalidatePath("/forms");
  redirect("/forms");
}
