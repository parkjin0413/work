import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TasksPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { getBoardMock, getNoteLogForWeekMock } = vi.hoisted(() => ({
  getBoardMock: vi.fn(),
  getNoteLogForWeekMock: vi.fn(),
}));

vi.mock("@/lib/tasks/tasksStore", () => ({
  getBoard: getBoardMock,
  getNoteLogForWeek: getNoteLogForWeekMock,
}));

const emptyLog = {
  weekStart: "2026-09-21",
  weekEnd: "2026-09-27",
  days: [
    "2026-09-21",
    "2026-09-22",
    "2026-09-23",
    "2026-09-24",
    "2026-09-25",
    "2026-09-26",
    "2026-09-27",
  ].map((date) => ({ date, entries: [] })),
};

async function renderTasksPage(searchParams: { week?: string } = {}) {
  const element = await TasksPage({ searchParams });
  return render(element);
}

describe("TasksPage", () => {
  beforeEach(() => {
    getBoardMock.mockReset();
    getNoteLogForWeekMock.mockReset().mockResolvedValue(emptyLog);
  });

  it("고정 업무를 카드로 보여준다", async () => {
    getBoardMock.mockResolvedValue({
      fixedTasks: [
        { taskId: "task-1", templateId: "tpl-1", name: "주간업무일지 제출", weekday: 3, isCompleted: false },
      ],
      incomplete: [],
      completed: [],
    });

    await renderTasksPage();

    expect(screen.getByText("주간업무일지 제출")).toBeInTheDocument();
    expect(screen.getByText("목요일")).toBeInTheDocument();
  });

  it("지정한 날짜(월/일/요일)와 함께 업무 목록을 보여준다", async () => {
    getBoardMock.mockResolvedValue({
      fixedTasks: [],
      incomplete: [
        {
          id: "task-2",
          name: "디자인 시안 검토",
          memo: "1차 컨펌 대기",
          taskDate: "2026-08-10",
          isCompleted: false,
          completedAt: null,
          createdAt: "2026-08-10T00:00:00.000Z",
          sortOrder: 0,
          notes: [],
        },
      ],
      completed: [],
    });

    await renderTasksPage();

    expect(screen.getByText("디자인 시안 검토")).toBeInTheDocument();
    // 2026-08-10은 월요일
    expect(screen.getByText("8월 10일 (월)")).toBeInTheDocument();
  });

  it("완료된 업무는 완료일과 함께 완료됨 섹션에 남아있다", async () => {
    getBoardMock.mockResolvedValue({
      fixedTasks: [],
      incomplete: [],
      completed: [
        {
          id: "task-3",
          name: "지난주에 끝낸 인쇄 업무",
          memo: null,
          taskDate: "2026-08-05",
          isCompleted: true,
          completedAt: "2026-08-20T00:00:00.000Z",
          createdAt: "2026-08-05T00:00:00.000Z",
          sortOrder: 0,
          notes: [],
        },
      ],
    });

    await renderTasksPage();

    expect(screen.getByText("완료됨")).toBeInTheDocument();
    expect(screen.getByText("지난주에 끝낸 인쇄 업무")).toHaveClass("line-through");
    // completed_at 2026-08-20은 목요일
    expect(screen.getByText("완료 8월 20일 (목)")).toBeInTheDocument();
  });

  it("재시도까지 실패하면 안내 문구를 보여준다", async () => {
    getBoardMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await renderTasksPage();

    expect(getBoardMock).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();

    expect(
      screen.getByText(
        "업무 정보를 불러오지 못했습니다. Supabase 연결 상태와 tasks 관련 마이그레이션(0004~0006) 실행 여부를 확인해주세요."
      )
    ).toBeInTheDocument();
  });

  it("첫 조회가 실패해도 재시도가 성공하면 정상 화면을 보여준다", async () => {
    // 콜드 스타트 직후 첫 요청만 실패하는 상황
    getBoardMock
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValue({ fixedTasks: [], incomplete: [], completed: [] });
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await renderTasksPage();

    expect(getBoardMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText("업무 목록")).toBeInTheDocument();
    expect(screen.queryByText(/업무 정보를 불러오지 못했습니다/)).not.toBeInTheDocument();
    consoleWarnSpy.mockRestore();
  });

  it("주간 메모만 실패하면 업무 목록은 그대로 보여주고 메모 영역에만 안내를 띄운다", async () => {
    getBoardMock.mockResolvedValue({ fixedTasks: [], incomplete: [], completed: [] });
    getNoteLogForWeekMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await renderTasksPage();

    expect(screen.getByText(/진행 메모를 불러오지 못했습니다/)).toBeInTheDocument();
    expect(screen.getByText("업무 목록")).toBeInTheDocument();
    expect(screen.queryByText(/업무 정보를 불러오지 못했습니다/)).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it("주간 메모 정리를 업무 목록보다 위에 보여준다", async () => {
    getBoardMock.mockResolvedValue({ fixedTasks: [], incomplete: [], completed: [] });

    const { container } = await renderTasksPage();

    const headings = Array.from(container.querySelectorAll("h1, h2")).map((el) => el.textContent);
    expect(headings).toEqual(["업무관리", "주간 메모 정리", "고정 업무", "업무 목록"]);
  });

  it("쿼리로 준 주(week)가 유효한 월요일이면 그 주의 메모를 조회한다", async () => {
    getBoardMock.mockResolvedValue({ fixedTasks: [], incomplete: [], completed: [] });

    await renderTasksPage({ week: "2026-09-07" });

    expect(getNoteLogForWeekMock).toHaveBeenCalledWith("2026-09-07");
  });

  it("월요일이 아닌 week 값은 무시하고 이번 주를 조회한다", async () => {
    getBoardMock.mockResolvedValue({ fixedTasks: [], incomplete: [], completed: [] });

    await renderTasksPage({ week: "2026-09-09" }); // 수요일 → 무효

    const calledWith = getNoteLogForWeekMock.mock.calls[0][0];
    expect(calledWith).not.toBe("2026-09-09");
    expect(/^\d{4}-\d{2}-\d{2}$/.test(calledWith)).toBe(true);
  });
});
