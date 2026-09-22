import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { WeeklyNoteBoard } from "./WeeklyNoteBoard";
import type { NoteLog, NoteLogDay } from "@/lib/tasks/tasksStore";

function day(date: string, entries: NoteLogDay["entries"] = []): NoteLogDay {
  return { date, entries };
}

function makeLog(overrides: Partial<Record<string, NoteLogDay["entries"]>> = {}): NoteLog {
  const dates = [
    "2026-09-07",
    "2026-09-08",
    "2026-09-09",
    "2026-09-10",
    "2026-09-11",
    "2026-09-12",
    "2026-09-13",
  ];
  return {
    weekStart: "2026-09-07",
    weekEnd: "2026-09-13",
    days: dates.map((date) => day(date, overrides[date] ?? [])),
  };
}

const entry = {
  noteId: "n1",
  taskId: "task-1",
  taskName: "마우스패드 제작",
  body: "샘플 방문 일정 조율",
  createdAt: "2026-09-08T01:00:00.000Z",
};

describe("WeeklyNoteBoard", () => {
  it("평일 5칸을 항상 보여주고, 메모가 없는 날은 안내 문구를 넣는다", () => {
    render(<WeeklyNoteBoard log={makeLog()} currentWeekStart="2026-09-07" todayISO="2026-09-08" />);

    // 월~금 5칸
    expect(screen.getByText("9.7 (월)")).toBeInTheDocument();
    expect(screen.getByText("9.11 (금)")).toBeInTheDocument();
    // 메모 없는 주말(토/일)은 칸을 만들지 않는다
    expect(screen.queryByText("9.12 (토)")).not.toBeInTheDocument();
    expect(screen.getAllByText("메모 없음")).toHaveLength(5);
  });

  it("해당 날짜 칸에 업무명과 메모를 보여준다", () => {
    render(
      <WeeklyNoteBoard
        log={makeLog({ "2026-09-08": [entry] })}
        currentWeekStart="2026-09-07"
        todayISO="2026-09-08"
      />
    );

    expect(screen.getByText("마우스패드 제작")).toBeInTheDocument();
    expect(screen.getByText("샘플 방문 일정 조율")).toBeInTheDocument();
    expect(screen.getByText("총 1건")).toBeInTheDocument();
  });

  it("주말에 메모가 있으면 그 날짜 칸을 추가로 보여준다", () => {
    render(
      <WeeklyNoteBoard
        log={makeLog({ "2026-09-12": [{ ...entry, noteId: "n2", body: "토요일 근무 메모" }] })}
        currentWeekStart="2026-09-07"
        todayISO="2026-09-08"
      />
    );

    expect(screen.getByText("9.12 (토)")).toBeInTheDocument();
    expect(screen.getByText("토요일 근무 메모")).toBeInTheDocument();
  });

  it("이전/다음 주 이동 링크와 이번 주 표시를 보여준다", () => {
    render(
      <WeeklyNoteBoard log={makeLog()} currentWeekStart="2026-09-07" todayISO="2026-09-08" />
    );

    expect(screen.getByRole("link", { name: "이전 주" })).toHaveAttribute("href", "/tasks?week=2026-08-31");
    expect(screen.getByRole("link", { name: "다음 주" })).toHaveAttribute("href", "/tasks?week=2026-09-14");
    expect(screen.getByText("9월 7일 (월) ~ 9월 13일 (일) (이번 주)")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "이번 주로" })).not.toBeInTheDocument();
  });

  it("다른 주를 보고 있으면 이번 주로 돌아가는 링크를 보여준다", () => {
    render(
      <WeeklyNoteBoard log={makeLog()} currentWeekStart="2026-09-14" todayISO="2026-09-15" />
    );

    expect(screen.getByRole("link", { name: "이번 주로" })).toHaveAttribute("href", "/tasks");
  });

  it("메모가 없으면 복사 버튼을 보여주지 않는다", () => {
    render(<WeeklyNoteBoard log={makeLog()} currentWeekStart="2026-09-07" todayISO="2026-09-08" />);

    expect(screen.queryByRole("button", { name: "표 복사 (엑셀용)" })).not.toBeInTheDocument();
  });

  it("표 복사를 누르면 날짜/업무명/메모를 탭으로 구분해 클립보드에 담는다", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(
      <WeeklyNoteBoard
        log={makeLog({
          "2026-09-08": [{ ...entry, taskName: "견적\t검토", body: "1줄\n2줄" }],
        })}
        currentWeekStart="2026-09-07"
        todayISO="2026-09-08"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "표 복사 (엑셀용)" }));
    });

    // 메모 안 줄바꿈/탭은 공백으로 접어 한 메모 = 한 줄을 유지한다
    expect(writeText).toHaveBeenCalledWith("날짜\t업무명\t메모\n9월 8일 (화)\t견적 검토\t1줄 2줄");
  });
});
