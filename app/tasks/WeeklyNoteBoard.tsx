import Link from "next/link";
import { ChevronLeft, ChevronRight, NotebookText } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import type { NoteLog, NoteLogDay } from "@/lib/tasks/tasksStore";
import { addDaysISO, formatMonthDayWeekday, formatShortDateWeekday } from "@/lib/tasks/week";
import { SectionHeader } from "./SectionHeader";

/** 엑셀에 날짜/업무명/메모 3열로 그대로 붙여넣을 수 있는 탭 구분 텍스트를 만든다. */
function buildTsv(days: NoteLogDay[]): string {
  const lines = ["날짜\t업무명\t메모"];

  for (const day of days) {
    const dateLabel = formatMonthDayWeekday(day.date);
    for (const entry of day.entries) {
      // 줄바꿈은 공백으로 접어 한 메모 = 표 한 줄이 깨지지 않게 하고, 다른 곳에서
      // 붙여넣기로 들어왔을 수 있는 탭 문자는 열 구분과 충돌하지 않게 공백으로 바꾼다.
      const taskName = entry.taskName.replace(/\t/g, " ");
      const body = entry.body.replace(/\r?\n+/g, " ").replace(/\t/g, " ");
      lines.push(`${dateLabel}\t${taskName}\t${body}`);
    }
  }

  return lines.join("\n");
}

export function WeeklyNoteBoard({
  log,
  currentWeekStart,
  todayISO,
}: {
  log: NoteLog;
  currentWeekStart: string;
  todayISO: string;
}) {
  // 평일(월~금)은 항상 5칸을 유지하고, 주말은 메모가 있을 때만 칸을 만든다.
  const weekdayCards = log.days.slice(0, 5);
  const weekendCards = log.days.slice(5).filter((day) => day.entries.length > 0);
  const cards = [...weekdayCards, ...weekendCards];

  const filledDays = log.days.filter((day) => day.entries.length > 0);
  const totalCount = filledDays.reduce((sum, day) => sum + day.entries.length, 0);
  const isCurrentWeek = log.weekStart === currentWeekStart;

  return (
    <section>
      <SectionHeader icon={NotebookText} title="주간 메모 정리">
        <div className="flex items-center gap-1">
          <Link
            href={`/tasks?week=${addDaysISO(log.weekStart, -7)}`}
            aria-label="이전 주"
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="text-xs text-muted">
            {formatMonthDayWeekday(log.weekStart)} ~ {formatMonthDayWeekday(log.weekEnd)}
            {isCurrentWeek ? " (이번 주)" : ""}
          </span>
          <Link
            href={`/tasks?week=${addDaysISO(log.weekStart, 7)}`}
            aria-label="다음 주"
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {!isCurrentWeek ? (
            <Link href="/tasks" className="ml-1 text-xs text-accent hover:underline">
              이번 주로
            </Link>
          ) : null}
        </div>
        <span className="text-xs text-muted">총 {totalCount}건</span>
        {totalCount > 0 ? <CopyButton text={buildTsv(filledDays)} label="표 복사 (엑셀용)" /> : null}
      </SectionHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((day) => (
          <div
            key={day.date}
            className={`flex min-w-0 flex-col rounded-2xl border bg-surface p-3 ${
              day.date === todayISO ? "border-accent" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium text-foreground">{formatShortDateWeekday(day.date)}</span>
              {day.entries.length > 0 ? (
                <span className="shrink-0 text-[0.61rem] text-muted">{day.entries.length}건</span>
              ) : null}
            </div>

            {day.entries.length === 0 ? (
              <p className="mt-2 text-xs text-muted">메모 없음</p>
            ) : (
              <ul className="mt-2 flex max-h-64 flex-col gap-2 overflow-y-auto">
                {day.entries.map((entry) => (
                  <li key={entry.noteId} className="min-w-0 rounded-lg bg-bg p-2">
                    <p className="truncate text-[0.61rem] text-muted" title={entry.taskName}>
                      {entry.taskName}
                    </p>
                    <p className="mt-0.5 whitespace-pre-wrap break-words text-xs text-foreground">{entry.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
