import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const actions = vi.hoisted(() => ({
  createWorkItemAction: vi.fn(),
  createWorkItemsAction: vi.fn(),
  updateWorkItemAction: vi.fn(),
  moveWorkItemsAction: vi.fn(),
  deleteWorkItemAction: vi.fn(),
  reorderWorkItemsAction: vi.fn(),
}));
vi.mock("./workItemActions", () => actions);

import { WeekPlanner } from "./WeekPlanner";

function renderPlanner() {
  return render(
    <WeekPlanner
      weekStart="2026-11-09"
      currentWeekStart="2026-11-09"
      todayISO="2026-11-09"
      items={[]}
      overdue={[]}
      schedules={[]}
      holidays={{}}
      projects={[]}
    />
  );
}

describe("WeekPlanner 여러 줄 붙여넣기", () => {
  beforeEach(() => Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue([])));

  it("다음 주 할 일 계획 칸에 엑셀 번호 목록을 붙여넣으면 줄마다 계획으로 넣는다", async () => {
    const saved = (id: string, body: string, sortOrder: number) => ({
      id,
      date: "2026-11-16",
      body,
      status: "planned",
      projectId: null,
      projectName: null,
      scheduleId: null,
      sortOrder,
      createdAt: "2026-11-09T00:00:00.000Z",
    });
    actions.createWorkItemsAction.mockResolvedValue([saved("n1", "사이트맵 확정", 1), saved("n2", "게시판 설계", 2)]);
    renderPlanner();

    fireEvent.paste(screen.getByLabelText("11월 16일 (월) 할 일 계획"), {
      clipboardData: { getData: () => '"1. 사이트맵 확정\n2. 게시판 설계"' },
    });

    await waitFor(() =>
      expect(actions.createWorkItemsAction).toHaveBeenCalledWith({
        date: "2026-11-16",
        bodies: ["사이트맵 확정", "게시판 설계"],
        status: "planned",
        projectId: null,
      })
    );
    expect(await screen.findByText("사이트맵 확정")).toBeInTheDocument();
    expect(screen.getByText("게시판 설계")).toBeInTheDocument();
  });

  it("한 줄이면 평소처럼 입력칸에 붙는다", () => {
    renderPlanner();
    fireEvent.paste(screen.getByLabelText("11월 9일 (월) 한 일 적기"), {
      clipboardData: { getData: () => "보고서 작성" },
    });
    expect(actions.createWorkItemsAction).not.toHaveBeenCalled();
  });
});

describe("WeekPlanner 체크 규칙", () => {
  const planned = (id: string, date: string, body: string) => ({
    id,
    date,
    body,
    status: "planned" as const,
    projectId: null,
    projectName: null,
    scheduleId: null,
    sortOrder: 0,
    createdAt: "2026-11-09T00:00:00.000Z",
  });

  it("이번 주 항목은 체크할 수 있고, 다음 주 계획은 체크 칸이 없다", () => {
    render(
      <WeekPlanner
        weekStart="2026-11-09"
        currentWeekStart="2026-11-09"
        todayISO="2026-11-09"
        items={[planned("a", "2026-11-12", "이번 주 목요일 일"), planned("b", "2026-11-16", "다음 주 월요일 일")]}
        overdue={[]}
        schedules={[]}
        holidays={{}}
        projects={[]}
      />
    );

    expect(screen.getByRole("button", { name: "이번 주 목요일 일 완료" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다음 주 월요일 일 완료" })).not.toBeInTheDocument();
    expect(screen.getByText("다음 주 월요일 일")).toBeInTheDocument();
  });
});
