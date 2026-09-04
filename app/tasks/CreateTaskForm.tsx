"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction } from "./actions";

function todayInputValue(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CreateTaskForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [taskDate, setTaskDate] = useState(todayInputValue);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !taskDate) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createTaskAction({ name, memo, taskDate });
      setName("");
      setMemo("");
      setTaskDate(todayInputValue());
      router.refresh();
    } catch {
      setErrorMessage("할 일 추가에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        type="date"
        value={taskDate}
        onChange={(e) => setTaskDate(e.target.value)}
        aria-label="날짜"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="할 일 이름"
        aria-label="할 일 이름"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="진행상황 (선택)"
        aria-label="진행상황"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !name.trim() || !taskDate}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "+ 할 일 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
