"use client";

import { useState, type FormEvent } from "react";
import { SCHEDULE_CATEGORIES, CATEGORY_COLORS, type ScheduleCategory } from "@/lib/schedule/categories";
import type { ScheduleInput } from "@/lib/schedule/scheduleStore";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

export function ScheduleForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ScheduleInput;
  submitLabel: string;
  onSubmit: (input: ScheduleInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [category, setCategory] = useState<ScheduleCategory>(initial.category);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [memo, setMemo] = useState(initial.memo ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSubmit({ title, category, startDate, endDate: endDate || startDate, memo });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl border border-accent bg-surface p-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="분류">
        {SCHEDULE_CATEGORIES.map((option) => {
          const active = option === category;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setCategory(option)}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                active ? CATEGORY_COLORS[option].chip : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${CATEGORY_COLORS[option].dot}`} />
              {option}
            </button>
          );
        })}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="일정 내용"
        aria-label="일정 내용"
        autoFocus
        className={INPUT_CLASS}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (endDate < e.target.value) setEndDate(e.target.value);
            }}
            aria-label="시작일"
            className={INPUT_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          종료일
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="종료일"
            className={INPUT_CLASS}
          />
        </label>
      </div>

      <textarea
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 (시간, 장소, 담당자 등)"
        aria-label="메모"
        rows={3}
        className={INPUT_CLASS}
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSaving || !title.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted">
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
