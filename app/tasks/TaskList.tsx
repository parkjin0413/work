"use client";

import { useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { GeneralTask } from "@/lib/tasks/tasksStore";
import { formatMonthDayWeekday } from "@/lib/tasks/week";
import { setTaskCompletionAction, deleteTaskAction, updateTaskAction } from "./actions";

const CARD_GRID_BASE = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6";

export function TaskList({
  incomplete: initialIncomplete,
  completed: initialCompleted,
}: {
  incomplete: GeneralTask[];
  completed: GeneralTask[];
}) {
  const [incomplete, setIncomplete] = useState(initialIncomplete);
  const [completed, setCompleted] = useState(initialCompleted);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setIncomplete(initialIncomplete);
  }, [initialIncomplete]);

  useEffect(() => {
    setCompleted(initialCompleted);
  }, [initialCompleted]);

  async function handleToggle(task: GeneralTask, nextCompleted: boolean) {
    const previousIncomplete = incomplete;
    const previousCompleted = completed;

    if (nextCompleted) {
      setIncomplete((prev) => prev.filter((t) => t.id !== task.id));
      setCompleted((prev) => [{ ...task, isCompleted: true, completedAt: new Date().toISOString() }, ...prev]);
    } else {
      setCompleted((prev) => prev.filter((t) => t.id !== task.id));
      setIncomplete((prev) => [...prev, { ...task, isCompleted: false, completedAt: null }]);
    }
    setErrorMessage(null);

    try {
      await setTaskCompletionAction(task.id, nextCompleted);
    } catch {
      setIncomplete(previousIncomplete);
      setCompleted(previousCompleted);
      setErrorMessage("완료 처리에 실패했습니다.");
    }
  }

  async function handleDelete(task: GeneralTask) {
    const previousIncomplete = incomplete;
    const previousCompleted = completed;
    setIncomplete((prev) => prev.filter((t) => t.id !== task.id));
    setCompleted((prev) => prev.filter((t) => t.id !== task.id));
    setErrorMessage(null);

    try {
      await deleteTaskAction(task.id);
    } catch {
      setIncomplete(previousIncomplete);
      setCompleted(previousCompleted);
      setErrorMessage("삭제에 실패했습니다.");
    }
  }

  function handleSaved(id: string, name: string, memo: string | null, taskDate: string) {
    setIncomplete((prev) => prev.map((t) => (t.id === id ? { ...t, name, memo, taskDate } : t)));
    setCompleted((prev) => prev.map((t) => (t.id === id ? { ...t, name, memo, taskDate } : t)));
  }

  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-foreground">업무 목록</h2>

      {errorMessage ? (
        <p role="alert" className="mb-4 mt-2 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {incomplete.length === 0 ? (
        <p className="mt-3 text-sm text-muted">할 일이 없습니다.</p>
      ) : (
        <div className={`mt-3 ${CARD_GRID_BASE}`}>
          {incomplete.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={(next) => handleToggle(task, next)}
              onDelete={() => handleDelete(task)}
              onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
            />
          ))}
        </div>
      )}

      {completed.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted">완료됨</h3>
          <div className={`mt-2 ${CARD_GRID_BASE}`}>
            {completed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(next) => handleToggle(task, next)}
                onDelete={() => handleDelete(task)}
                onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onSaved,
}: {
  task: GeneralTask;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
  onSaved: (name: string, memo: string | null, taskDate: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editMemo, setEditMemo] = useState(task.memo ?? "");
  const [editDate, setEditDate] = useState(task.taskDate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCheckboxChange() {
    setIsToggling(true);
    await Promise.resolve(onToggle(!task.isCompleted));
    setIsToggling(false);
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const trimmedMemo = editMemo.trim();
      await updateTaskAction({ id: task.id, name: editName, memo: trimmedMemo, taskDate: editDate });
      onSaved(editName.trim(), trimmedMemo || null, editDate);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClick() {
    setIsDeleting(true);
    onDelete();
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface p-4">
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          aria-label="날짜"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          aria-label="업무 이름"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <textarea
          value={editMemo}
          onChange={(e) => setEditMemo(e.target.value)}
          placeholder="진행상황 (선택)"
          aria-label="진행상황"
          rows={3}
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editName.trim() || !editDate}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditName(task.name);
              setEditMemo(task.memo ?? "");
              setEditDate(task.taskDate);
              setErrorMessage(null);
              setIsEditing(false);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs text-muted">{formatMonthDayWeekday(task.taskDate)}</span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${task.name} 수정`}
            className="rounded-md p-1 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label={`${task.name} 삭제`}
            className="rounded-md p-1 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleCheckboxChange}
          disabled={isToggling}
          aria-label={`${task.name} 완료`}
          className="mt-1"
        />
        <span
          className={`min-w-0 break-words text-sm font-medium ${
            task.isCompleted ? "text-muted line-through" : "text-foreground"
          }`}
        >
          {task.name}
        </span>
      </label>

      <div
        className={`min-h-[3rem] rounded-lg bg-bg p-2 text-xs text-muted ${
          task.isCompleted ? "line-through" : ""
        }`}
      >
        {task.memo || "진행상황 없음"}
      </div>

      {task.completedAt ? (
        <span className="text-xs text-muted">완료 {formatMonthDayWeekday(task.completedAt.slice(0, 10))}</span>
      ) : null}
    </div>
  );
}
