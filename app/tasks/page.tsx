export const dynamic = "force-dynamic";

import { ListChecks } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { getBoard, getNoteLogForWeek, type Board, type NoteLog } from "@/lib/tasks/tasksStore";
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

  let board: Board;
  let noteLog: NoteLog;

  try {
    [board, noteLog] = await Promise.all([getBoard(), getNoteLogForWeek(weekStart)]);
  } catch (error) {
    console.error("[tasks] 업무 정보 조회 실패:", error);
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

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">업무관리</h1>

        <div className="mt-6 space-y-8">
          <WeeklyNoteBoard log={noteLog} currentWeekStart={currentWeekStart} todayISO={todayISO} />

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
