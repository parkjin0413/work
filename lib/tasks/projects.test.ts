import { describe, it, expect } from "vitest";
import { buildProjects } from "./projects";

const base = { memo: null, completed_at: null, created_at: "2026-09-01T00:00:00.000Z" };

function row(id: string, extra: Record<string, unknown> = {}) {
  return { id, name: id, kind: "project", is_completed: false, ...base, ...extra };
}

function note(id: string, taskId: string, workDate: string | null, status: string, sortOrder = 0) {
  return { id, task_id: taskId, work_date: workDate, body: id, status, sort_order: sortOrder, created_at: "2026-09-01T00:00:00.000Z" };
}

describe("buildProjects", () => {
  it("항목을 남은 단계 / 예정 / 한 일로 나눈다", () => {
    const [project] = buildProjects(
      [row("홈페이지")],
      [
        note("단계B", "홈페이지", null, "planned", 2),
        note("단계A", "홈페이지", null, "planned", 1),
        note("예정2", "홈페이지", "2026-11-12", "planned"),
        note("예정1", "홈페이지", "2026-11-10", "planned"),
        note("한일1", "홈페이지", "2026-11-03", "done"),
        note("한일2", "홈페이지", "2026-11-04", "done"),
      ]
    );

    expect(project.steps.map((s) => s.id)).toEqual(["단계A", "단계B"]);
    expect(project.scheduled.map((s) => s.id)).toEqual(["예정1", "예정2"]);
    expect(project.done.map((s) => s.id)).toEqual(["한일2", "한일1"]);
    expect(project.lastDoneDate).toBe("2026-11-04");
  });

  it("진행 중은 최근에 손댄 순, 완료는 맨 뒤로 보낸다", () => {
    const projects = buildProjects(
      [
        row("오래된"),
        row("최근"),
        row("완료됨", { is_completed: true, completed_at: "2026-10-01T00:00:00.000Z" }),
      ],
      [note("a", "오래된", "2026-10-01", "done"), note("b", "최근", "2026-11-05", "done")]
    );

    expect(projects.map((p) => p.id)).toEqual(["최근", "오래된", "완료됨"]);
  });

  it("kind 가 ongoing 이면 상시 업무, 그 외는 프로젝트", () => {
    const projects = buildProjects([row("나스", { kind: "ongoing" }), row("x", { kind: null })], []);
    expect(Object.fromEntries(projects.map((p) => [p.id, p.kind]))).toEqual({ 나스: "ongoing", x: "project" });
  });
});
