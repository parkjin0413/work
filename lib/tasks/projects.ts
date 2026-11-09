import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

/**
 * 프로젝트 = tasks 테이블의 일반 업무(고정 업무 잔여 행 제외).
 * 항목(task_notes) 가운데 날짜가 없는 것은 "남은 단계", 날짜가 있는 것은 플래너의 기록·계획이다.
 */
export type ProjectKind = "project" | "ongoing";

export type ProjectStep = { id: string; body: string; sortOrder: number; createdAt: string };

export type ProjectEntry = { id: string; date: string; body: string; status: "planned" | "done" };

export type Project = {
  id: string;
  name: string;
  memo: string | null;
  kind: ProjectKind;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
  /** 날짜를 정하지 않은 단계 (적은 순서) */
  steps: ProjectStep[];
  /** 날짜를 정한 계획 (가까운 날짜부터) */
  scheduled: ProjectEntry[];
  /** 한 일 (최근부터) */
  done: ProjectEntry[];
  /** 마지막으로 한 일의 날짜 */
  lastDoneDate: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  memo: string | null;
  kind: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
};

type ItemRow = {
  id: string;
  task_id: string;
  work_date: string | null;
  body: string;
  status: string;
  sort_order: number;
  created_at: string;
};

/** 진행 중인 프로젝트는 최근에 손댄 순서, 완료된 것은 최근 완료 순서. */
export function sortProjects(projects: Project[]): Project[] {
  const activity = (p: Project) => p.lastDoneDate ?? p.createdAt.slice(0, 10);
  return [...projects].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (a.isCompleted) return (b.completedAt ?? "").localeCompare(a.completedAt ?? "");
    return activity(b).localeCompare(activity(a)) || a.name.localeCompare(b.name);
  });
}

export function buildProjects(rows: ProjectRow[], items: ItemRow[]): Project[] {
  const byProject = new Map<string, ItemRow[]>();
  for (const item of items) {
    const list = byProject.get(item.task_id) ?? [];
    list.push(item);
    byProject.set(item.task_id, list);
  }

  const projects = rows.map((row): Project => {
    const own = byProject.get(row.id) ?? [];
    const steps = own
      .filter((i) => i.work_date == null)
      .sort((a, b) => a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at))
      .map((i) => ({ id: i.id, body: i.body, sortOrder: i.sort_order, createdAt: i.created_at }));
    const dated = own
      .filter((i): i is ItemRow & { work_date: string } => i.work_date != null)
      .map((i) => ({
        id: i.id,
        date: i.work_date,
        body: i.body,
        status: (i.status === "planned" ? "planned" : "done") as ProjectEntry["status"],
        order: `${i.work_date}|${String(i.sort_order).padStart(10, "0")}|${i.created_at}`,
      }));
    const scheduled = dated
      .filter((i) => i.status === "planned")
      .sort((a, b) => a.order.localeCompare(b.order))
      .map(({ order: _order, ...rest }) => rest);
    const done = dated
      .filter((i) => i.status === "done")
      .sort((a, b) => b.order.localeCompare(a.order))
      .map(({ order: _order, ...rest }) => rest);

    return {
      id: row.id,
      name: row.name,
      memo: row.memo,
      kind: row.kind === "ongoing" ? "ongoing" : "project",
      isCompleted: row.is_completed,
      completedAt: row.completed_at,
      createdAt: row.created_at,
      steps,
      scheduled,
      done,
      lastDoneDate: done[0]?.date ?? null,
    };
  });

  return sortProjects(projects);
}

export async function listProjects(): Promise<Project[]> {
  const supabase = createSupabaseServiceClient();
  const { data: rows, error } = await supabase
    .from("tasks")
    .select("id, name, memo, kind, is_completed, completed_at, created_at")
    .is("template_id", null)
    .is("week_start", null);

  if (error) {
    throw new Error(`프로젝트 조회 실패: ${error.message}`);
  }

  const ids = (rows ?? []).map((row) => row.id);
  let items: ItemRow[] = [];
  if (ids.length > 0) {
    const { data, error: itemsError } = await supabase
      .from("task_notes")
      .select("id, task_id, work_date, body, status, sort_order, created_at")
      .in("task_id", ids);

    if (itemsError) {
      throw new Error(`프로젝트 기록 조회 실패: ${itemsError.message}`);
    }
    items = (data ?? []) as ItemRow[];
  }

  return buildProjects((rows ?? []) as ProjectRow[], items);
}

export async function createProject(name: string, kind: ProjectKind): Promise<string> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({ name, kind, task_date: new Date().toISOString().slice(0, 10) })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`프로젝트 추가 실패: ${error?.message ?? "알 수 없는 오류"}`);
  }
  return data.id;
}

export async function updateProject(
  id: string,
  patch: Partial<{ name: string; memo: string | null; kind: ProjectKind }>
): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tasks").update(patch).eq("id", id);

  if (error) {
    throw new Error(`프로젝트 수정 실패: ${error.message}`);
  }
}

export async function setProjectCompleted(id: string, isCompleted: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("tasks")
    .update({ is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) {
    throw new Error(`프로젝트 완료 처리 실패: ${error.message}`);
  }
}

/**
 * 프로젝트 삭제. 날짜가 있는 기록은 주간 업무(보고서)에 계속 필요하므로 연결만 끊어 남기고,
 * 날짜 없는 단계는 프로젝트와 함께 지운다(task_notes FK on delete cascade).
 */
export async function deleteProject(id: string): Promise<void> {
  // 프로젝트와 거기 딸린 단계·예정·한 일 기록을 한 번에 지운다 (task_notes.task_id 가 on delete cascade).
  // 끝난 프로젝트는 삭제 대신 "완료"로 두면 기록이 남는다.
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) {
    throw new Error(`프로젝트 삭제 실패: ${error.message}`);
  }
}

/** 여러 단계를 붙여넣은 순서대로 한 번에 추가한다. */
export async function addProjectSteps(projectId: string, bodies: string[]): Promise<ProjectStep[]> {
  const supabase = createSupabaseServiceClient();
  const base = Math.floor(Date.now() / 1000) % 2_000_000_000;
  const { data, error } = await supabase
    .from("task_notes")
    .insert(
      bodies.map((body, index) => ({
        task_id: projectId,
        body,
        status: "planned",
        work_date: null,
        sort_order: base + index,
      }))
    )
    .select("id, body, sort_order, created_at");

  if (error || !data) {
    throw new Error(`단계 추가 실패: ${error?.message ?? "알 수 없는 오류"}`);
  }
  return data
    .map((row) => ({ id: row.id, body: row.body, sortOrder: row.sort_order, createdAt: row.created_at }))
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function addProjectStep(projectId: string, body: string): Promise<ProjectStep> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("task_notes")
    .insert({
      task_id: projectId,
      body,
      status: "planned",
      work_date: null,
      sort_order: Math.floor(Date.now() / 1000) % 2_000_000_000,
    })
    .select("id, body, sort_order, created_at")
    .single();

  if (error || !data) {
    throw new Error(`단계 추가 실패: ${error?.message ?? "알 수 없는 오류"}`);
  }
  return { id: data.id, body: data.body, sortOrder: data.sort_order, createdAt: data.created_at };
}
