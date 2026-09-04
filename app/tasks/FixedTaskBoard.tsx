"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { FixedTaskCard } from "@/lib/tasks/tasksStore";
import { WEEKDAY_LABELS } from "@/lib/tasks/week";
import { createTemplateAction, renameTemplateAction, archiveTemplateAction, setTaskCompletionAction } from "./actions";

const inputClass =
  "rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

const CARD_GRID_STYLE = { gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" };

export function FixedTaskBoard({ tasks }: { tasks: FixedTaskCard[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-foreground">고정 업무</h2>
      <div className="mt-3 grid gap-4" style={CARD_GRID_STYLE}>
        {tasks.map((task) => (
          <FixedTaskItem key={task.templateId} task={task} />
        ))}
        <AddFixedTaskCard />
      </div>
    </section>
  );
}

function FixedTaskItem({ task }: { task: FixedTaskCard }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [name, setName] = useState(task.name);
  const [weekday, setWeekday] = useState(task.weekday);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleToggle() {
    setErrorMessage(null);
    setIsToggling(true);

    try {
      await setTaskCompletionAction(task.taskId, !task.isCompleted);
      router.refresh();
    } catch {
      setErrorMessage("완료 처리에 실패했습니다.");
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameTemplateAction(task.templateId, name, weekday);
      setIsEditing(false);
      router.refresh();
    } catch {
      setErrorMessage("수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    setErrorMessage(null);
    setIsArchiving(true);

    try {
      await archiveTemplateAction(task.templateId);
      router.refresh();
    } catch {
      setErrorMessage("보관에 실패했습니다.");
      setIsArchiving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface p-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="고정 업무 이름"
          className={inputClass}
        />
        <select
          value={weekday}
          onChange={(e) => setWeekday(Number(e.target.value))}
          aria-label="요일"
          className={inputClass}
        >
          {WEEKDAY_LABELS.map((label, index) => (
            <option key={index} value={index}>
              {label}요일
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsEditing(false);
              setName(task.name);
              setWeekday(task.weekday);
              setErrorMessage(null);
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
        <span className="inline-block rounded-full bg-bg px-2 py-0.5 text-xs text-muted">
          {WEEKDAY_LABELS[task.weekday]}요일
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${task.name} 수정`}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            aria-label={`${task.name} 보관`}
            className="rounded-md p-1.5 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleToggle}
          disabled={isToggling}
          aria-label={`${task.name} 완료`}
        />
        <span
          className={`text-sm font-medium ${task.isCompleted ? "text-muted line-through" : "text-foreground"}`}
        >
          {task.name}
        </span>
      </label>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function AddFixedTaskCard() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [weekday, setWeekday] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createTemplateAction(name, weekday);
      setName("");
      setWeekday(0);
      setIsOpen(false);
      router.refresh();
    } catch {
      setErrorMessage("추가에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex min-h-[92px] items-center justify-center rounded-2xl border border-dashed border-border text-sm text-muted hover:border-accent hover:text-accent"
      >
        + 고정 업무 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="업무 이름"
        aria-label="새 고정 업무 이름"
        className={inputClass}
      />
      <select
        value={weekday}
        onChange={(e) => setWeekday(Number(e.target.value))}
        aria-label="새 고정 업무 요일"
        className={inputClass}
      >
        {WEEKDAY_LABELS.map((label, index) => (
          <option key={index} value={index}>
            {label}요일
          </option>
        ))}
      </select>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isCreating || !name.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isCreating ? "추가 중..." : "추가"}
        </button>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setName("");
            setWeekday(0);
            setErrorMessage(null);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
        >
          취소
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
