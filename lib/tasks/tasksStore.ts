import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { getKstTodayISO, getMondayOfISO } from "./week";

export type FixedTaskCard = {
  taskId: string;
  templateId: string;
  name: string;
  weekday: number;
  isCompleted: boolean;
};

export type GeneralTask = {
  id: string;
  name: string;
  memo: string | null;
  taskDate: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  sortOrder: number;
};

export type Board = {
  fixedTasks: FixedTaskCard[];
  incomplete: GeneralTask[];
  completed: GeneralTask[];
};

type TemplateRow = { id: string; name: string; weekday: number; sort_order: number };

function toGeneralTask(row: {
  id: string;
  name: string;
  memo: string | null;
  task_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  sort_order: number;
}): GeneralTask {
  return {
    id: row.id,
    name: row.name,
    memo: row.memo,
    // task_date 컬럼 도입 이전에 만들어진 행은 null일 수 있어 생성일로 대체한다.
    taskDate: row.task_date ?? row.created_at.slice(0, 10),
    isCompleted: row.is_completed,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  };
}

async function materializeWeek(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  weekStart: string,
  templates: TemplateRow[]
): Promise<void> {
  if (templates.length === 0) return;

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("template_id")
    .eq("week_start", weekStart)
    .not("template_id", "is", null);

  if (existingError) {
    throw new Error(`이번 주 고정 업무 확인 실패: ${existingError.message}`);
  }

  const existingTemplateIds = new Set((existing ?? []).map((row) => row.template_id));
  const missing = templates.filter((template) => !existingTemplateIds.has(template.id));
  if (missing.length === 0) return;

  const { error: insertError } = await supabase.from("tasks").insert(
    missing.map((template) => ({
      template_id: template.id,
      name: template.name,
      weekday: template.weekday,
      week_start: weekStart,
      sort_order: template.sort_order,
    }))
  );

  if (insertError) {
    throw new Error(`이번 주 고정 업무 생성 실패: ${insertError.message}`);
  }
}

export async function getBoard(): Promise<Board> {
  const supabase = createSupabaseServiceClient();
  const weekStart = getMondayOfISO(getKstTodayISO());

  const { data: templateRows, error: templatesError } = await supabase
    .from("task_templates")
    .select("id, name, weekday, sort_order")
    .is("archived_at", null)
    .order("weekday", { ascending: true })
    .order("sort_order", { ascending: true });

  if (templatesError) {
    throw new Error(`고정 업무 조회 실패: ${templatesError.message}`);
  }

  const templates: TemplateRow[] = templateRows ?? [];
  await materializeWeek(supabase, weekStart, templates);

  const { data: fixedRows, error: fixedError } = await supabase
    .from("tasks")
    .select("id, template_id, name, weekday, is_completed")
    .eq("week_start", weekStart);

  if (fixedError) {
    throw new Error(`고정 업무 조회 실패: ${fixedError.message}`);
  }

  const fixedTasks: FixedTaskCard[] = (fixedRows ?? [])
    .map((row) => ({
      taskId: row.id,
      templateId: row.template_id as string,
      name: row.name,
      weekday: row.weekday as number,
      isCompleted: row.is_completed,
    }))
    .sort((a, b) => a.weekday - b.weekday);

  const { data: generalRows, error: generalError } = await supabase
    .from("tasks")
    .select("id, name, memo, task_date, is_completed, completed_at, sort_order, created_at")
    .is("template_id", null);

  if (generalError) {
    throw new Error(`업무 조회 실패: ${generalError.message}`);
  }

  const generalTasks = (generalRows ?? []).map(toGeneralTask);
  const incomplete = generalTasks
    .filter((task) => !task.isCompleted)
    .sort((a, b) => a.taskDate.localeCompare(b.taskDate));
  const completed = generalTasks
    .filter((task) => task.isCompleted)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return { fixedTasks, incomplete, completed };
}

export async function createTemplate(name: string, weekday: number): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("task_templates").insert({ name, weekday });

  if (error) {
    throw new Error(`고정 업무 생성 실패: ${error.message}`);
  }
}

export async function renameTemplate(id: string, name: string, weekday: number): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("task_templates").update({ name, weekday }).eq("id", id);

  if (error) {
    throw new Error(`고정 업무 수정 실패: ${error.message}`);
  }
}

export async function archiveTemplate(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("task_templates")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(`고정 업무 보관 실패: ${error.message}`);
  }
}

export async function createTask(input: { name: string; memo: string | null; taskDate: string }): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tasks").insert({
    template_id: null,
    name: input.name,
    memo: input.memo,
    task_date: input.taskDate,
    weekday: null,
    week_start: null,
  });

  if (error) {
    throw new Error(`업무 생성 실패: ${error.message}`);
  }
}

export async function updateTask(
  id: string,
  input: { name: string; memo: string | null; taskDate: string }
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ name: input.name, memo: input.memo, task_date: input.taskDate })
    .eq("id", id);

  if (error) {
    throw new Error(`업무 수정 실패: ${error.message}`);
  }
}

export async function setTaskCompletion(id: string, isCompleted: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) {
    throw new Error(`업무 완료 처리 실패: ${error.message}`);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    throw new Error(`업무 삭제 실패: ${error.message}`);
  }
}
