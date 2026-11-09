import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

/**
 * 주간 플래너의 한 줄 항목. DB에서는 task_notes 테이블을 그대로 쓴다
 * (예전 "진행 메모"가 날짜·상태를 가진 항목으로 확장된 것 — 0020_work_items.sql).
 */
export type WorkItemStatus = "planned" | "done";

export type WorkItem = {
  id: string;
  date: string;
  body: string;
  status: WorkItemStatus;
  /** 연결된 프로젝트(= 업무 목록의 업무). 없으면 null */
  projectId: string | null;
  projectName: string | null;
  /** 연간일정에서 담아온 항목이면 그 일정 id */
  scheduleId: string | null;
  sortOrder: number;
  createdAt: string;
};

export type ProjectOption = { id: string; name: string };

const SELECT_COLUMNS = "id, work_date, body, status, task_id, schedule_id, sort_order, created_at, task:tasks(name)";

type Row = {
  id: string;
  work_date: string;
  body: string;
  status: string;
  task_id: string | null;
  schedule_id: string | null;
  sort_order: number;
  created_at: string;
  task: { name: string } | null;
};

function toWorkItem(row: Row): WorkItem {
  return {
    id: row.id,
    date: row.work_date,
    body: row.body,
    status: row.status === "planned" ? "planned" : "done",
    projectId: row.task_id,
    projectName: row.task?.name ?? null,
    scheduleId: row.schedule_id,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/** 같은 날 안에서는 지정한 순서, 같으면 적은 순서. */
export function compareWorkItems(a: WorkItem, b: WorkItem): number {
  return a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt);
}

/** [first, last] 기간의 항목 (날짜·순서대로). */
export async function listWorkItemsInRange(first: string, last: string): Promise<WorkItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("task_notes")
    .select(SELECT_COLUMNS)
    .gte("work_date", first)
    .lte("work_date", last)
    .order("work_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`업무 항목 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as unknown as Row[]).map(toWorkItem);
}

/** 날짜가 지났는데 아직 계획 상태인 항목 (못 한 일). */
export async function listOverduePlanned(beforeDate: string): Promise<WorkItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("task_notes")
    .select(SELECT_COLUMNS)
    .eq("status", "planned")
    .lt("work_date", beforeDate)
    .order("work_date", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`밀린 계획 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as unknown as Row[]).map(toWorkItem);
}

export type WorkItemInput = {
  date: string;
  body: string;
  status: WorkItemStatus;
  projectId: string | null;
  scheduleId?: string | null;
};

export async function createWorkItem(input: WorkItemInput): Promise<WorkItem> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("task_notes")
    .insert({
      work_date: input.date,
      body: input.body,
      status: input.status,
      task_id: input.projectId,
      schedule_id: input.scheduleId ?? null,
      // 같은 날 맨 아래에 붙도록 시각 기반 순서값을 쓴다 (정수 범위 안).
      sort_order: Math.floor(Date.now() / 1000) % 2_000_000_000,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) {
    throw new Error(`업무 항목 추가 실패: ${error?.message ?? "알 수 없는 오류"}`);
  }

  return toWorkItem(data as unknown as Row);
}

export type WorkItemPatch = Partial<{
  /** null 이면 날짜를 비워 프로젝트의 "남은 단계"로 돌려보낸다 */
  date: string | null;
  body: string;
  status: WorkItemStatus;
  projectId: string | null;
}>;

export async function updateWorkItem(id: string, patch: WorkItemPatch): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.date !== undefined) row.work_date = patch.date;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.projectId !== undefined) row.task_id = patch.projectId;
  if (Object.keys(row).length === 0) return;

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("task_notes").update(row).eq("id", id);

  if (error) {
    throw new Error(`업무 항목 수정 실패: ${error.message}`);
  }
}

/** 여러 항목을 한 날짜로 옮긴다 (못 한 계획 넘기기). */
export async function moveWorkItems(ids: string[], date: string): Promise<void> {
  if (ids.length === 0) return;
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("task_notes").update({ work_date: date }).in("id", ids);

  if (error) {
    throw new Error(`업무 항목 이동 실패: ${error.message}`);
  }
}

export async function deleteWorkItem(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("task_notes").delete().eq("id", id);

  if (error) {
    throw new Error(`업무 항목 삭제 실패: ${error.message}`);
  }
}
