import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { isValidISODate } from "./calendar";
import { isScheduleCategory, type ScheduleCategory } from "./categories";

export type Schedule = {
  id: string;
  title: string;
  category: ScheduleCategory;
  startDate: string;
  endDate: string;
  memo: string | null;
};

export type ScheduleInput = Omit<Schedule, "id">;

type Row = {
  id: string;
  title: string;
  category: string;
  start_date: string;
  end_date: string;
  memo: string | null;
};

function toSchedule(row: Row): Schedule {
  return {
    id: row.id,
    title: row.title,
    category: row.category as ScheduleCategory,
    startDate: row.start_date,
    endDate: row.end_date,
    memo: row.memo,
  };
}

/** 입력값 검증. 잘못된 값이면 사용자에게 보여줄 한국어 메시지로 에러를 던진다. */
export function validateScheduleInput(input: ScheduleInput): ScheduleInput {
  const title = input.title.trim();
  if (!title) throw new Error("일정 내용을 입력해주세요.");
  if (!isScheduleCategory(input.category)) throw new Error("분류를 선택해주세요.");
  if (!isValidISODate(input.startDate)) throw new Error("시작일이 올바르지 않습니다.");
  const endDate = input.endDate || input.startDate;
  if (!isValidISODate(endDate)) throw new Error("종료일이 올바르지 않습니다.");
  if (endDate < input.startDate) throw new Error("종료일은 시작일보다 빠를 수 없습니다.");

  return {
    title,
    category: input.category,
    startDate: input.startDate,
    endDate,
    memo: input.memo?.trim() || null,
  };
}

/** 기간이 [first, last]와 하루라도 겹치는 일정. */
export async function listSchedulesInRange(first: string, last: string): Promise<Schedule[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, category, start_date, end_date, memo")
    .lte("start_date", last)
    .gte("end_date", first)
    .order("start_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`일정 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as Row[]).map(toSchedule);
}

function toRow(input: ScheduleInput) {
  const valid = validateScheduleInput(input);
  return {
    title: valid.title,
    category: valid.category,
    start_date: valid.startDate,
    end_date: valid.endDate,
    memo: valid.memo,
  };
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
