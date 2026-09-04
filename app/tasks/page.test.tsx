import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import TasksPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { getBoardMock } = vi.hoisted(() => ({
  getBoardMock: vi.fn(),
}));

vi.mock("@/lib/tasks/tasksStore", () => ({
  getBoard: getBoardMock,
}));

async function renderTasksPage() {
  const element = await TasksPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("TasksPage", () => {
  beforeEach(() => {
    getBoardMock.mockReset();
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
        },
      ],
    });

    await renderTasksPage();

    expect(screen.getByText("완료됨")).toBeInTheDocument();
    expect(screen.getByText("지난주에 끝낸 인쇄 업무")).toHaveClass("line-through");
    // completed_at 2026-08-20은 목요일
    expect(screen.getByText("완료 8월 20일 (목)")).toBeInTheDocument();
  });

  it("조회가 실패하면 안내 문구를 보여준다", async () => {
    getBoardMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderTasksPage();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();

    expect(
      screen.getByText(
        "업무 정보를 불러오지 못했습니다. Supabase 연결 상태와 0004_tasks.sql 마이그레이션 실행 여부를 확인해주세요."
      )
    ).toBeInTheDocument();
  });
});
