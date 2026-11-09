import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { MY_EMPLOYEE_NAME } from "@/lib/leave/config";
import { expenseDocPrefix, leaveDocPrefix, nextExpenseDocNumber, nextLeaveDocNumber } from "./docNumber";
import type { ExpenseFields, LeaveFields } from "./parse";
import {
  EMPTY_LEAVE_BALANCE_ENTRY,
  type ApproverCandidate,
  type DrafterProfile,
  type ExpenseItem,
  type ExpenseReport,
  type ExpenseReportSummary,
  type FormApprover,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveRequestSummary,
} from "./types";

// ── 기안자 · 결재자 (직원명단) ───────────────────────────

type EmployeeRow = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  department: { name: string; sort_order: number } | null;
  sort_order: number;
};

const EMPLOYEE_COLUMNS = "id, name, position, phone, sort_order, department:employee_departments(name, sort_order)";

/** 문서에 찍을 내 이름·부서·직급. 직원명단에 내가 없으면 이름만 채운다. */
export async function getDrafterProfile(): Promise<DrafterProfile> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select(EMPLOYEE_COLUMNS)
    .eq("name", MY_EMPLOYEE_NAME)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`기안자 정보 조회 실패: ${error.message}`);

  const row = (data as unknown as EmployeeRow[])[0];
  return {
    name: MY_EMPLOYEE_NAME,
    department: row?.department?.name ?? "",
    position: row?.position ?? "",
    phone: row?.phone ?? "",
  };
}

/** 결재자 선택 목록: 나를 뺀 직원 전부 (부서 순서 → 부서 안 순서) */
export async function listApproverCandidates(): Promise<ApproverCandidate[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("employees").select(EMPLOYEE_COLUMNS);
  if (error) throw new Error(`직원 목록 조회 실패: ${error.message}`);

  return (data as unknown as EmployeeRow[])
    .filter((row) => row.name !== MY_EMPLOYEE_NAME)
    .sort(
      (a, b) =>
        (a.department?.sort_order ?? 0) - (b.department?.sort_order ?? 0) ||
        (a.department?.name ?? "").localeCompare(b.department?.name ?? "") ||
        a.sort_order - b.sort_order
    )
    .map((row) => ({
      id: row.id,
      name: row.name,
      position: row.position ?? "",
      department: row.department?.name ?? "",
    }));
}

/** 고른 직원 id 들을 결재자(이름·직급 포함)로 바꾼다. 명단에 없는 id 가 있으면 null */
export async function resolveApprovers(ids: string[]): Promise<FormApprover[] | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("employees").select("id, name, position").in("id", ids);
  if (error) throw new Error(`결재자 조회 실패: ${error.message}`);

  const byId = new Map((data ?? []).map((row) => [row.id as string, row]));
  if (ids.some((id) => !byId.has(id))) return null;
  return ids.map((id, index) => ({
    order: index + 1,
    employeeId: id,
    name: String(byId.get(id)!.name),
    jobTitle: String(byId.get(id)!.position ?? ""),
  }));
}

function toApprovers(value: unknown): FormApprover[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index) => {
      const a = raw as Partial<FormApprover>;
      return {
        order: Number(a.order) || index + 1,
        employeeId: a.employeeId ?? null,
        name: String(a.name ?? ""),
        jobTitle: String(a.jobTitle ?? ""),
      };
    })
    .sort((a, b) => a.order - b.order);
}

async function listDocNumbers(table: "expense_reports" | "leave_requests", prefix: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  // 부서 이름에 % _ 가 들어갈 일은 없지만, 접두어 비교는 아래 startsWith 로 한 번 더 거른다.
  const { data, error } = await supabase.from(table).select("doc_number").like("doc_number", `${prefix}%`);
  if (error) throw new Error(`문서번호 조회 실패: ${error.message}`);
  return (data ?? []).map((row) => String(row.doc_number));
}

// ── 품의서 ──────────────────────────────────────────────

type ExpenseRow = {
  id: string;
  doc_number: string;
  drafter_name: string;
  drafter_position: string;
  department: string;
  drafted_at: string;
  title: string;
  content: string;
  items: ExpenseItem[] | null;
  total_amount: number | string;
  consultations: { department?: string }[] | string[] | null;
  instructions: string;
  attachment_types: string[] | null;
  attachment_other: string;
  approvers: unknown;
  created_at: string;
};

function toExpenseReport(row: ExpenseRow): ExpenseReport {
  return {
    id: row.id,
    docNumber: row.doc_number,
    drafterName: row.drafter_name,
    drafterPosition: row.drafter_position,
    department: row.department,
    draftedAt: row.drafted_at,
    title: row.title,
    content: row.content,
    items: (row.items ?? []).map((item) => ({
      description: String(item.description ?? ""),
      vendor: String(item.vendor ?? ""),
      amount: Number(item.amount) || 0,
    })),
    totalAmount: Number(row.total_amount) || 0,
    // dateout 에서는 [{department}] 로 저장했다.
    consultations: (row.consultations ?? [])
      .map((c) => (typeof c === "string" ? c : String(c.department ?? "")))
      .filter(Boolean),
    instructions: row.instructions,
    attachmentTypes: row.attachment_types ?? [],
    attachmentOther: row.attachment_other,
    approvers: toApprovers(row.approvers),
    createdAt: row.created_at,
  };
}

export async function listExpenseReports(): Promise<ExpenseReportSummary[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("expense_reports")
    .select("id, doc_number, title, drafted_at, total_amount")
    .order("drafted_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`품의서 목록 조회 실패: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    docNumber: row.doc_number,
    title: row.title,
    draftedAt: row.drafted_at,
    totalAmount: Number(row.total_amount) || 0,
  }));
}

export async function getExpenseReport(id: string): Promise<ExpenseReport | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("expense_reports").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`품의서 조회 실패: ${error.message}`);
  return data ? toExpenseReport(data as ExpenseRow) : null;
}

function expenseColumns(fields: ExpenseFields, approvers: FormApprover[]) {
  return {
    drafted_at: fields.draftedAt,
    title: fields.title,
    content: fields.content,
    items: fields.items,
    total_amount: fields.totalAmount,
    consultations: fields.consultations.map((department) => ({ department })),
    instructions: fields.instructions,
    attachment_types: fields.attachmentTypes,
    attachment_other: fields.attachmentOther,
    approvers,
  };
}

export async function createExpenseReport(
  drafter: DrafterProfile,
  fields: ExpenseFields,
  approvers: FormApprover[]
): Promise<string> {
  const existing = await listDocNumbers("expense_reports", expenseDocPrefix(drafter.department, fields.draftedAt));
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("expense_reports")
    .insert({
      doc_number: nextExpenseDocNumber(drafter.department, fields.draftedAt, existing),
      drafter_name: drafter.name,
      drafter_position: drafter.position,
      department: drafter.department,
      ...expenseColumns(fields, approvers),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`품의서 저장 실패: ${error?.message ?? "알 수 없는 오류"}`);
  return data.id;
}

/** 수정해도 문서번호·기안자 정보는 처음 그대로 둔다. */
export async function updateExpenseReport(id: string, fields: ExpenseFields, approvers: FormApprover[]): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("expense_reports")
    .update({ ...expenseColumns(fields, approvers), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`품의서 수정 실패: ${error.message}`);
}

export async function deleteExpenseReport(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("expense_reports").delete().eq("id", id);
  if (error) throw new Error(`품의서 삭제 실패: ${error.message}`);
}

// ── 휴가신청서 ──────────────────────────────────────────

type LeaveRow = {
  id: string;
  doc_number: string;
  drafter_name: string;
  drafter_position: string;
  department: string;
  drafted_at: string;
  start_date: string;
  end_date: string;
  days: number | string;
  leave_type: string;
  reason: string;
  substitute_job_title: string;
  substitute_name: string;
  leave_balance: Partial<LeaveBalance> | null;
  approvers: unknown;
  created_at: string;
};

function toLeaveRequest(row: LeaveRow): LeaveRequest {
  return {
    id: row.id,
    docNumber: row.doc_number,
    drafterName: row.drafter_name,
    drafterPosition: row.drafter_position,
    department: row.department,
    draftedAt: row.drafted_at,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    leaveType: row.leave_type,
    reason: row.reason,
    substituteJobTitle: row.substitute_job_title,
    substituteName: row.substitute_name,
    leaveBalance: {
      annual: { ...EMPTY_LEAVE_BALANCE_ENTRY, ...row.leave_balance?.annual },
      substitute: { ...EMPTY_LEAVE_BALANCE_ENTRY, ...row.leave_balance?.substitute },
    },
    approvers: toApprovers(row.approvers),
    createdAt: row.created_at,
  };
}

export async function listLeaveRequests(): Promise<LeaveRequestSummary[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .select("id, doc_number, drafted_at, start_date, end_date, days, leave_type")
    .order("start_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`휴가신청서 목록 조회 실패: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    docNumber: row.doc_number,
    draftedAt: row.drafted_at,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    leaveType: row.leave_type,
  }));
}

export async function getLeaveRequest(id: string): Promise<LeaveRequest | null> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("leave_requests").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`휴가신청서 조회 실패: ${error.message}`);
  return data ? toLeaveRequest(data as LeaveRow) : null;
}

function leaveColumns(fields: LeaveFields, approvers: FormApprover[]) {
  return {
    drafted_at: fields.draftedAt,
    start_date: fields.startDate,
    end_date: fields.endDate,
    days: fields.days,
    leave_type: fields.leaveType,
    reason: fields.reason,
    substitute_job_title: fields.substituteJobTitle,
    substitute_name: fields.substituteName,
    leave_balance: fields.leaveBalance,
    approvers,
  };
}

export async function createLeaveRequest(
  drafter: DrafterProfile,
  today: string,
  fields: LeaveFields,
  approvers: FormApprover[]
): Promise<string> {
  const existing = await listDocNumbers("leave_requests", leaveDocPrefix(today, drafter.phone));
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      doc_number: nextLeaveDocNumber(today, drafter.phone, existing),
      drafter_name: drafter.name,
      drafter_position: drafter.position,
      department: drafter.department,
      ...leaveColumns(fields, approvers),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`휴가신청서 저장 실패: ${error?.message ?? "알 수 없는 오류"}`);
  return data.id;
}

export async function updateLeaveRequest(id: string, fields: LeaveFields, approvers: FormApprover[]): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("leave_requests")
    .update({ ...leaveColumns(fields, approvers), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`휴가신청서 수정 실패: ${error.message}`);
}

export async function deleteLeaveRequest(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("leave_requests").delete().eq("id", id);
  if (error) throw new Error(`휴가신청서 삭제 실패: ${error.message}`);
}

// ── 내 도장 ─────────────────────────────────────────────
// 비공개 버킷에 한 장만 둔다. 바꿀 때마다 새 이름으로 올리고 예전 것은 지운다
// (같은 이름으로 덮어쓰면 CDN 캐시 때문에 한동안 예전 도장이 보일 수 있다).

const STAMP_BUCKET = "form-stamps";
export const STAMP_MAX_BYTES = 2 * 1024 * 1024;

async function listStampPaths(): Promise<string[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from(STAMP_BUCKET)
    .list("", { sortBy: { column: "created_at", order: "desc" } });
  if (error) throw new Error(`도장 조회 실패: ${error.message}`);
  return (data ?? []).map((file) => file.name).filter((name) => name.startsWith("stamp-"));
}

/** 도장 이미지 주소 (1시간짜리 서명 URL). 없거나 버킷이 아직 없으면 null */
export async function getStampUrl(): Promise<string | null> {
  try {
    const [path] = await listStampPaths();
    if (!path) return null;
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase.storage.from(STAMP_BUCKET).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  } catch (error) {
    console.error("[forms] 도장 조회 실패:", error);
    return null;
  }
}

export async function uploadStamp(file: File): Promise<void> {
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase() : "";
  const path = `stamp-${Date.now()}${ext}`;
  const old = await listStampPaths();

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage
    .from(STAMP_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (error) throw new Error(`도장 업로드 실패: ${error.message}`);

  if (old.length > 0) await supabase.storage.from(STAMP_BUCKET).remove(old);
}

export async function deleteStamp(): Promise<void> {
  const paths = await listStampPaths();
  if (paths.length === 0) return;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.storage.from(STAMP_BUCKET).remove(paths);
  if (error) throw new Error(`도장 삭제 실패: ${error.message}`);
}
