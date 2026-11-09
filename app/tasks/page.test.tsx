import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TasksPage from "./page";
import type { WorkItem } from "@/lib/tasks/workItems";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listWorkItemsInRange: vi.fn(),
  listOverduePlanned: vi.fn(),
  listSchedulesInRange: vi.fn(),
}));

vi.mock("@/lib/tasks/projects", () => ({ listProjects: mocks.listProjects }));
vi.mock("@/lib/tasks/workItems", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tasks/workItems")>();
  return {
    ...actual,
    listWorkItemsInRange: mocks.listWorkItemsInRange,
    listOverduePlanned: mocks.listOverduePlanned,
  };
});
vi.mock("@/lib/schedule/scheduleStore", () => ({ listSchedulesInRange: mocks.listSchedulesInRange }));
vi.mock("./projectActions", () => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
  setProjectCompletedAction: vi.fn(),
  deleteProjectAction: vi.fn(),
  addProjectStepAction: vi.fn(),
  addProjectStepsAction: vi.fn(),
}));
vi.mock("./workItemActions", () => ({
  createWorkItemAction: vi.fn(),
  createWorkItemsAction: vi.fn(),
  updateWorkItemAction: vi.fn(),
  moveWorkItemsAction: vi.fn(),
  deleteWorkItemAction: vi.fn(),
  searchWorkItemsAction: vi.fn(),
  reorderWorkItemsAction: vi.fn(),
}));

function item(partial: Partial<WorkItem> & Pick<WorkItem, "id" | "date" | "body">): WorkItem {
  return {
    status: "done",
    projectId: null,
    projectName: null,
    scheduleId: null,
    sortOrder: 0,
    createdAt: `${partial.date}T01:00:00.000Z`,
    ...partial,
  };
}

async function renderTasksPage(searchParams: { week?: string } = {}) {
  const element = await TasksPage({ searchParams });
  return render(element);
}

describe("TasksPage", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((fn) => fn.mockReset());
    mocks.listProjects.mockResolvedValue([]);
    mocks.listWorkItemsInRange.mockResolvedValue([]);
    mocks.listOverduePlanned.mockResolvedValue([]);
    mocks.listSchedulesInRange.mockResolvedValue([]);
  });

  it("주간 업무를 프로젝트 목록보다 위에 보여준다", async () => {
    const { container } = await renderTasksPage();

    const headings = Array.from(container.querySelectorAll("h1, h2")).map((el) => el.textContent);
    expect(headings).toEqual(["업무", "주간 업무", "프로젝트"]);
  });

  it("쿼리로 준 주가 유효한 월요일이면 그 주부터 2주치 항목과 일정을 조회한다", async () => {
    await renderTasksPage({ week: "2026-09-07" });

    expect(mocks.listWorkItemsInRange).toHaveBeenCalledWith("2026-09-07", "2026-09-20");
    expect(mocks.listSchedulesInRange).toHaveBeenCalledWith("2026-09-07", "2026-09-20");
    // 지난 주를 볼 때는 밀린 계획을 띄우지 않는다
    expect(mocks.listOverduePlanned).not.toHaveBeenCalled();
  });

  it("월요일이 아닌 week 값은 무시하고 이번 주를 조회한다", async () => {
    await renderTasksPage({ week: "2026-09-09" });

    const [first] = mocks.listWorkItemsInRange.mock.calls[0];
    expect(first).not.toBe("2026-09-09");
    expect(mocks.listOverduePlanned).toHaveBeenCalled();
  });

  it("항목을 날짜 칸에 보여주고, 보고서 미리보기에는 완료한 항목만 번호를 붙여 넣는다", async () => {
    mocks.listWorkItemsInRange.mockResolvedValue([
      item({ id: "a", date: "2026-09-07", body: "전시회 철거 물품 정리", projectName: "2026 전시회" }),
      item({ id: "b", date: "2026-09-07", body: "못 한 계획", status: "planned" }),
      item({ id: "c", date: "2026-09-14", body: "사이트맵 확정", status: "planned" }),
    ]);

    await renderTasksPage({ week: "2026-09-07" });

    expect(screen.getByText("전시회 철거 물품 정리")).toBeInTheDocument();
    expect(screen.getByText("#2026 전시회")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /주간업무보고 만들기/ }));
    expect(screen.getByText("9월 07일 - 9월 13일")).toBeInTheDocument();
    expect(screen.getByText("1. 전시회 철거 물품 정리")).toBeInTheDocument();
    expect(screen.getByText("1. 사이트맵 확정")).toBeInTheDocument();
    expect(screen.queryByText("1. 못 한 계획")).not.toBeInTheDocument();
    expect(screen.getByText(/이번 주에 못 한 계획/)).toBeInTheDocument();
  });

  it("연간일정을 해당 날짜에 흐리게 보여준다", async () => {
    mocks.listSchedulesInRange.mockResolvedValue([
      {
        id: "s1",
        title: "카페24 미팅",
        category: "미팅",
        startDate: "2026-09-08",
        endDate: "2026-09-08",
        memo: null,
        leaveType: null,
        employeeId: null,
        employeeLabel: null,
      },
    ]);

    await renderTasksPage({ week: "2026-09-07" });

    expect(screen.getByRole("button", { name: "카페24 미팅 일정을 8일 업무로 담기" })).toBeInTheDocument();
  });

  it("주간 항목 조회가 실패해도 프로젝트 목록은 보여준다", async () => {
    mocks.listWorkItemsInRange.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await renderTasksPage();

    expect(screen.getByText(/주간 업무를 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("프로젝트 목록만 실패하면 그 자리에만 안내를 띄운다", async () => {
    mocks.listProjects.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await renderTasksPage();

    expect(screen.getByText(/프로젝트 목록을 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByText("주간 업무")).toBeInTheDocument();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
