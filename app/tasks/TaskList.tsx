"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import type { GeneralTask, TaskNote } from "@/lib/tasks/tasksStore";
import { formatMonthDayWeekday, formatNoteTimestamp } from "@/lib/tasks/week";
import {
  setTaskCompletionAction,
  deleteTaskAction,
  updateTaskAction,
  addTaskNoteAction,
  deleteTaskNoteAction,
} from "./actions";

const CARD_GRID_BASE = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

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

  function patchNotes(id: string, updater: (notes: TaskNote[]) => TaskNote[]) {
    const apply = (list: GeneralTask[]) =>
      list.map((t) => (t.id === id ? { ...t, notes: updater(t.notes) } : t));
    setIncomplete(apply);
    setCompleted(apply);
  }

  function handleNoteAdded(taskId: string, note: TaskNote) {
    patchNotes(taskId, (notes) => [...notes, note]);
  }

  function handleNoteDeleted(taskId: string, noteId: string) {
    patchNotes(taskId, (notes) => notes.filter((n) => n.id !== noteId));
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
              onNoteAdded={(note) => handleNoteAdded(task.id, note)}
              onNoteDeleted={(noteId) => handleNoteDeleted(task.id, noteId)}
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
                onNoteAdded={(note) => handleNoteAdded(task.id, note)}
                onNoteDeleted={(noteId) => handleNoteDeleted(task.id, noteId)}
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
  onNoteAdded,
  onNoteDeleted,
}: {
  task: GeneralTask;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
  onSaved: (name: string, memo: string | null, taskDate: string) => void;
  onNoteAdded: (note: TaskNote) => void;
  onNoteDeleted: (noteId: string) => void;
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
          className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          aria-label="업무 이름"
          className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <textarea
          value={editMemo}
          onChange={(e) => setEditMemo(e.target.value)}
          placeholder="진행상황 (선택)"
          aria-label="진행상황"
          rows={3}
          className="w-full min-w-0 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <div className="flex flex-wrap items-center gap-2">
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
        className={`min-h-[3rem] whitespace-pre-wrap break-words rounded-lg bg-bg p-2 text-xs text-muted ${
          task.isCompleted ? "line-through" : ""
        }`}
      >
        {task.memo || "진행상황 없음"}
      </div>

      <TaskNotes
        taskId={task.id}
        notes={task.notes}
        onNoteAdded={onNoteAdded}
        onNoteDeleted={onNoteDeleted}
      />

      {task.completedAt ? (
        <span className="text-xs text-muted">완료 {formatMonthDayWeekday(task.completedAt.slice(0, 10))}</span>
      ) : null}
    </div>
  );
}

function TaskNotes({
  taskId,
  notes,
  onNoteAdded,
  onNoteDeleted,
}: {
  taskId: string;
  notes: TaskNote[];
  onNoteAdded: (note: TaskNote) => void;
  onNoteDeleted: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isAdding) return;

    setError(null);
    setIsAdding(true);
    try {
      const note = await addTaskNoteAction(taskId, body);
      onNoteAdded(note);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "메모 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(noteId: string) {
    setError(null);
    try {
      await deleteTaskNoteAction(noteId);
      onNoteDeleted(noteId);
    } catch {
      setError("메모 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">진행 메모</p>

      {notes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {notes.map((note) => (
            <li
              key={note.id}
              className="group flex items-start gap-2 rounded-lg bg-bg px-2 py-1.5 text-xs"
            >
              <span className="shrink-0 font-mono text-[10px] leading-5 text-muted">
                {formatNoteTimestamp(note.createdAt)}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap break-words text-foreground">
                {note.body}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(note.id)}
                aria-label="진행 메모 삭제"
                className="shrink-0 rounded p-0.5 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={handleAdd} className="flex items-end gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="진행 메모 추가"
          aria-label="진행 메모 추가"
          rows={2}
          className="min-w-0 flex-1 resize-y rounded-lg border border-border bg-bg px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isAdding || !draft.trim()}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-bg disabled:opacity-50"
        >
          {isAdding ? "..." : "추가"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-[11px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
