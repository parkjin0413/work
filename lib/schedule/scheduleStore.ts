import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { isValidISODate } from "./calendar";
import { isScheduleCategory, type ScheduleCategory } from "./categories";
import type { LeaveType } from "@/lib/leave/annualLeave";
import { MY_EMPLOYEE_NAME } from "@/lib/leave/config";

export type Schedule = {
  id: string;
  title: string;
  category: ScheduleCategory;
  startDate: string;
  endDate: string;
  memo: string | null;
  /** 연차 일정만: 종일 / 오전 반차 / 오후 반차. 다른 분류는 null. */
  leaveType: LeaveType | null;
  /** 홍보부 일정만: 담당 직원 id와 표시용 "이름 직급" */
  employeeId: string | null;
  employeeLabel: string | null;
};

export type ScheduleInput = Omit<Schedule, "id" | "leaveType" | "employeeId" | "employeeLabel"> & {
  leaveType?: LeaveType | null;
  employeeId?: string | null;
};

/** 홍보부 팀원 (일정 담당자 선택용) */
export type TeamMember = { id: string; label: string };

export const TEAM_CATEGORY = "홍보부";
const TEAM_DEPARTMENT_NAME = "홍보부";

function employeeLabelOf(employee: { name: string; position: string | null } | null): string | null {
  if (!employee) return null;
  return employee.position ? `${employee.name} ${employee.position}` : employee.name;
}

type Row = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  memo: string | null;
  leave_type: string | null;
  employee_id: string | null;
  employee: { name: string; position: string | null } | null;
};

function toSchedule(row: Row): Schedule {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ScheduleCategory,
    startDate: row.start_date,
    endDate: row.end_date,
    memo: row.memo,
    leaveType: row.category === "연차" ? ((row.leave_type as LeaveType | null) ?? "full") : null,
    employeeId: row.category === TEAM_CATEGORY ? row.employee_id : null,
    employeeLabel: row.category === TEAM_CATEGORY ? employeeLabelOf(row.employee) : null,
  };
}

/** 입력값 검증. 잘못된 값이면 사용자에게 보여줄 한국어 메시지로 에러를 던진다. */
export function validateScheduleInput(input: ScheduleInput): Omit<Schedule, "id" | "employeeLabel"> {
  const title = input.title.trim();
  if (!title) throw new Error("일정 내용을 입력해주세요.");
  if (!isScheduleCategory(input.category)) throw new Error("분류를 선택해주세요.");
  if (!isValidISODate(input.startDate)) throw new Error("시작일이 올바르지 않습니다.");
  const isLeave = input.category === "연차";
  const leaveType: LeaveType | null = isLeave ? (input.leaveType ?? "full") : null;
  if (leaveType && !["full", "am", "pm"].includes(leaveType)) throw new Error("연차 종류가 올바르지 않습니다.");
  // 반차는 하루짜리라 종료일을 시작일로 맞춘다.
  const endDate = leaveType && leaveType !== "full" ? input.startDate : input.endDate || input.startDate;
  if (!isValidISODate(endDate)) throw new Error("종료일이 올바르지 않습니다.");
  if (endDate < input.startDate) throw new Error("종료일은 시작일보다 빠를 수 없습니다.");

  return {
    title,
    category: input.category,
    startDate: input.startDate,
    endDate,
    memo: input.memo?.trim() || null,
    leaveType,
    employeeId: input.category === TEAM_CATEGORY ? input.employeeId || null : null,
  };
}

const SELECT_COLUMNS =
  "id, title, category, start_date, end_date, memo, leave_type, employee_id, employee:employees(name, position)";

/** 기간이 [first, last]와 하루라도 겹치는 일정. */
export async function listSchedulesInRange(first: string, last: string): Promise<Schedule[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("schedules")
    .select(SELECT_COLUMNS)
    .lte("start_date", last)
    .gte("end_date", first)
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`일정 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as unknown as Row[]).map(toSchedule);
}

function toRow(input: ScheduleInput) {
  const valid = validateScheduleInput(input);
  return {
    title: valid.title,
    category: valid.category,
    start_date: valid.startDate,
    end_date: valid.endDate,
    memo: valid.memo,
    leave_type: valid.leaveType,
    employee_id: valid.employeeId,
  };
}

/** 연차 계산용: 연차 분류 일정 전체. */
export async function listLeaveSchedules(): Promise<Schedule[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("schedules")
    .select(SELECT_COLUMNS)
    .eq("category", "연차")
    .order("start_date", { ascending: true });

  if (error) {
    throw new Error(`연차 일정 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as unknown as Row[]).map(toSchedule);
}

export async function createSchedule(input: ScheduleInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("schedules").insert(toRow(input));

  if (error) {
    throw new Error(`일정 등록 실패: ${error.message}`);
  }
}

export async function updateSchedule(id: string, input: ScheduleInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("schedules")
    .update({ ...toRow(input), updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`일정 수정 실패: ${error.message}`);
  }
}

export async function deleteSchedule(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("schedules").delete().eq("id", id);

  if (error) {
    throw new Error(`일정 삭제 실패: ${error.message}`);
  }
}

/** 직원명단의 홍보부 직원 (직원명단 순서대로, 나는 제외). */
export async function listTeamMembers(): Promise<TeamMember[]> {
  const supabase = createSupabaseServiceClient();
  const { data: departments, error: departmentError } = await supabase
    .from("employee_departments")
    .select("id")
    .eq("name", TEAM_DEPARTMENT_NAME);

  if (departmentError) {
    throw new Error(`홍보부 조회 실패: ${departmentError.message}`);
  }
  const departmentIds = (departments ?? []).map((d) => d.id);
  if (departmentIds.length === 0) return [];

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, position")
    .in("department_id", departmentIds)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`홍보부 직원 조회 실패: ${error.message}`);
  }

  return (data ?? [])
    .filter((e) => e.name !== MY_EMPLOYEE_NAME)
    .map((e) => ({ id: e.id, label: employeeLabelOf(e)! }));
}
