export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { CopyButton } from "@/components/CopyButton";
import { getNoteLogForWeek, type NoteLog } from "@/lib/tasks/tasksStore";
import {
  addDaysISO,
  formatMonthDayWeekday,
  getKstTodayISO,
  getMondayOfISO,
  isValidMondayISO,
} from "@/lib/tasks/week";

/** 엑셀에 날짜/업무명/메모 3열로 그대로 붙여넣을 수 있는 탭 구분 텍스트를 만든다. */
function buildTsv(log: NoteLog): string {
  const lines = ["날짜\t업무명\t메모"];

  for (const day of log.days) {
    if (day.entries.length === 0) continue;
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

export default async function TaskNotesLogPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const currentWeekStart = getMondayOfISO(getKstTodayISO());
  const weekStart = isValidMondayISO(searchParams.week) ? searchParams.week : currentWeekStart;

  let log: NoteLog;
  try {
    log = await getNoteLogForWeek(weekStart);
  } catch (error) {
    console.error("[tasks/notes] getNoteLogForWeek 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">주간 메모 정리</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">진행 메모를 불러오지 못했습니다.</p>
          </div>
        </main>
      </div>
    );
  }

  const daysWithEntries = log.days.filter((day) => day.entries.length > 0);
  const totalCount = daysWithEntries.reduce((sum, day) => sum + day.entries.length, 0);
  const tsv = buildTsv(log);
  const prevWeekStart = addDaysISO(weekStart, -7);
  const nextWeekStart = addDaysISO(weekStart, 7);
  const isCurrentWeek = weekStart === currentWeekStart;

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> 업무관리로
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">주간 메모 정리</h1>
          {totalCount > 0 ? <CopyButton text={tsv} label="표 복사 (엑셀용)" /> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-foreground">
          <Link
            href={`/tasks/notes?week=${prevWeekStart}`}
            aria-label="이전 주"
            className="rounded-md p-1 hover:bg-surface"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span>
            {formatMonthDayWeekday(weekStart)} ~ {formatMonthDayWeekday(log.weekEnd)}
            {isCurrentWeek ? " (이번 주)" : ""}
          </span>
          <Link
            href={`/tasks/notes?week=${nextWeekStart}`}
            aria-label="다음 주"
            className="rounded-md p-1 hover:bg-surface"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {!isCurrentWeek ? (
            <Link href="/tasks/notes" className="text-xs text-accent hover:underline">
              이번 주로
            </Link>
          ) : null}
        </div>

        {daysWithEntries.length === 0 ? (
          <p className="mt-6 text-sm text-muted">이 주에 작성한 진행 메모가 없습니다.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-surface text-left text-xs text-muted">
                  <th className="w-28 px-3 py-2 font-medium">날짜</th>
                  <th className="w-48 px-3 py-2 font-medium">업무명</th>
                  <th className="px-3 py-2 font-medium">진행 메모</th>
                </tr>
              </thead>
              <tbody>
                {daysWithEntries.map((day) =>
                  day.entries.map((entry, idx) => (
                    <tr key={entry.noteId} className="border-b border-border last:border-0">
                      {idx === 0 ? (
                        <td rowSpan={day.entries.length} className="align-top px-3 py-2 text-xs text-muted">
                          {formatMonthDayWeekday(day.date)}
                        </td>
                      ) : null}
                      <td className="min-w-0 break-words align-top px-3 py-2 text-foreground">{entry.taskName}</td>
                      <td className="min-w-0 whitespace-pre-wrap break-words align-top px-3 py-2 text-foreground">
                        {entry.body}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-muted">
          총 {totalCount}건 · 표 복사 버튼을 누르면 엑셀에 날짜/업무명/메모 열로 그대로 붙여넣을 수 있습니다.
        </p>
      </main>
    </div>
  );
}
