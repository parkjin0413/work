import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import TaskNotesLogPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tasks/notes",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { getNoteLogForWeekMock } = vi.hoisted(() => ({
  getNoteLogForWeekMock: vi.fn(),
}));

vi.mock("@/lib/tasks/tasksStore", () => ({
  getNoteLogForWeek: getNoteLogForWeekMock,
}));

async function renderPage(searchParams: { week?: string } = {}) {
  const element = await TaskNotesLogPage({ searchParams });
  return render(element);
}

describe("TaskNotesLogPage", () => {
  beforeEach(() => {
    getNoteLogForWeekMock.mockReset();
  });

  it("날짜별로 메모를 묶어 표로 보여준다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      days: [
        { date: "2026-09-07", entries: [] },
        {
          date: "2026-09-08",
          entries: [
            {
              noteId: "n1",
              taskId: "task-1",
              taskName: "마우스패드 제작",
              body: "샘플 방문 일정 조율",
              createdAt: "2026-09-08T01:00:00.000Z",
            },
          ],
        },
        { date: "2026-09-09", entries: [] },
        { date: "2026-09-10", entries: [] },
        { date: "2026-09-11", entries: [] },
        { date: "2026-09-12", entries: [] },
        { date: "2026-09-13", entries: [] },
      ],
    });

    await renderPage({ week: "2026-09-07" });

    expect(getNoteLogForWeekMock).toHaveBeenCalledWith("2026-09-07");
    // 2026-09-08은 화요일
    expect(screen.getByText("9월 8일 (화)")).toBeInTheDocument();
    expect(screen.getByText("마우스패드 제작")).toBeInTheDocument();
    expect(screen.getByText("샘플 방문 일정 조율")).toBeInTheDocument();
    expect(screen.getByText("총 1건 · 표 복사 버튼을 누르면 엑셀에 날짜/업무명/메모 열로 그대로 붙여넣을 수 있습니다.")).toBeInTheDocument();
  });

  it("쿼리로 준 주(week)가 유효한 월요일이면 그 주를 조회한다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-08-31",
      weekEnd: "2026-09-06",
      days: [],
    });

    await renderPage({ week: "2026-08-31" });

    expect(getNoteLogForWeekMock).toHaveBeenCalledWith("2026-08-31");
  });

  it("월요일이 아닌 값이 오면 무시하고 이번 주를 조회한다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-08-31",
      weekEnd: "2026-09-06",
      days: [],
    });

    await renderPage({ week: "2026-09-03" }); // 목요일 → 무효

    const calledWith = getNoteLogForWeekMock.mock.calls[0][0];
    expect(calledWith).not.toBe("2026-09-03");
    expect(/^\d{4}-\d{2}-\d{2}$/.test(calledWith)).toBe(true);
  });

  it("메모가 하나도 없는 주는 안내 문구를 보여준다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      days: [
        { date: "2026-09-07", entries: [] },
        { date: "2026-09-08", entries: [] },
      ],
    });

    await renderPage();

    expect(screen.getByText("이 주에 작성한 진행 메모가 없습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "표 복사 (엑셀용)" })).not.toBeInTheDocument();
  });

  it("표 복사 버튼을 누르면 날짜/업무명/메모를 탭으로 구분한 텍스트를 클립보드에 담는다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      days: [
        {
          date: "2026-09-08",
          entries: [
            {
              noteId: "n1",
              taskId: "task-1",
              taskName: "마우스패드 제작",
              body: "1줄\n2줄",
              createdAt: "2026-09-08T01:00:00.000Z",
            },
          ],
        },
      ],
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "표 복사 (엑셀용)" }));
    });

    expect(writeText).toHaveBeenCalledWith(
      "날짜\t업무명\t메모\n9월 8일 (화)\t마우스패드 제작\t1줄 2줄"
    );
  });

  it("메모나 업무명에 탭 문자가 섞여 있어도 열 구분이 깨지지 않게 공백으로 바꿔 복사한다", async () => {
    getNoteLogForWeekMock.mockResolvedValue({
      weekStart: "2026-09-07",
      weekEnd: "2026-09-13",
      days: [
        {
          date: "2026-09-08",
          entries: [
            {
              noteId: "n1",
              taskId: "task-1",
              taskName: "견적\t검토",
              body: "인쇄\t비용 확인",
              createdAt: "2026-09-08T01:00:00.000Z",
            },
          ],
        },
      ],
    });

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await renderPage();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "표 복사 (엑셀용)" }));
    });

    expect(writeText).toHaveBeenCalledWith(
      "날짜\t업무명\t메모\n9월 8일 (화)\t견적 검토\t인쇄 비용 확인"
    );
  });

  it("조회가 실패하면 안내 문구를 보여준다", async () => {
    getNoteLogForWeekMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderPage();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
    expect(screen.getByText("진행 메모를 불러오지 못했습니다.")).toBeInTheDocument();
  });
});
