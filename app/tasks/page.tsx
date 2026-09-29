export const dynamic = "force-dynamic";

import Link from "next/link";
import { ListChecks, NotebookText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { withRetry } from "@/lib/supabase/withRetry";
import { getBoard, getNoteLogForWeek } from "@/lib/tasks/tasksStore";
import { getKstTodayISO, getMondayOfISO, isValidMondayISO } from "@/lib/tasks/week";
import { CreateTaskForm } from "./CreateTaskForm";
import { FixedTaskBoard } from "./FixedTaskBoard";
import { SectionHeader } from "./SectionHeader";
import { TaskList } from "./TaskList";
import { WeeklyNoteBoard } from "./WeeklyNoteBoard";

export default async function TasksPage({ searchParams }: { searchParams: { week?: string } }) {
  const todayISO = getKstTodayISO();
  const currentWeekStart = getMondayOfISO(todayISO);
  const weekStart = isValidMondayISO(searchParams.week) ? searchParams.week : currentWeekStart;

  // 둘 중 하나가 실패해도 나머지는 보여준다. 콜드 스타트 직후 첫 요청이 드물게
  // 실패하는 경우가 있어 각각 한 번씩 재시도한다.
  const [boardResult, noteLogResult] = await Promise.allSettled([
    withRetry(() => getBoard(), "tasks"),
    withRetry(() => getNoteLogForWeek(weekStart), "tasks/notes"),
  ]);

  if (boardResult.status === "rejected") {
    console.error("[tasks] 업무 정보 조회 실패:", boardResult.reason);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">업무관리</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              업무 정보를 불러오지 못했습니다. Supabase 연결 상태와
              tasks 관련 마이그레이션(0004~0006) 실행 여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const board = boardResult.value;

  if (noteLogResult.status === "rejected") {
    console.error("[tasks] 주간 메모 조회 실패:", noteLogResult.reason);
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">업무관리</h1>

        <div className="mt-6 space-y-8">
          {noteLogResult.status === "fulfilled" ? (
            <WeeklyNoteBoard
              log={noteLogResult.value}
              currentWeekStart={currentWeekStart}
              todayISO={todayISO}
            />
          ) : (
            <section>
              <SectionHeader icon={NotebookText} title="주간 메모 정리" />
              <p className="text-sm text-muted">
                진행 메모를 불러오지 못했습니다.{" "}
                <Link href="/tasks" className="text-accent hover:underline">
                  다시 시도
                </Link>
              </p>
            </section>
          )}

          <FixedTaskBoard tasks={board.fixedTasks} />

          <section>
            <SectionHeader icon={ListChecks} title="업무 목록" />
            <CreateTaskForm />
            <TaskList incomplete={board.incomplete} completed={board.completed} />
          </section>
        </div>
      </main>
    </div>
  );
}
