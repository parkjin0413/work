export const dynamic = "force-dynamic";

import Link from "next/link";
import { NotebookText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { getBoard, type Board } from "@/lib/tasks/tasksStore";
import { CreateTaskForm } from "./CreateTaskForm";
import { FixedTaskBoard } from "./FixedTaskBoard";
import { TaskList } from "./TaskList";

export default async function TasksPage() {
  let board: Board;

  try {
    board = await getBoard();
  } catch (error) {
    console.error("[tasks] getBoard 실패:", error);
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">업무관리</h1>
          <Link
            href="/tasks/notes"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
          >
            <NotebookText className="h-3.5 w-3.5" aria-hidden="true" /> 주간 메모 정리
          </Link>
        </div>

        <FixedTaskBoard tasks={board.fixedTasks} />

        <CreateTaskForm />
        <TaskList incomplete={board.incomplete} completed={board.completed} />
      </main>
    </div>
  );
}
