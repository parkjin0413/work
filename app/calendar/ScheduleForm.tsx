"use client";

import { useState, type FormEvent } from "react";
import { SCHEDULE_CATEGORIES, CATEGORY_COLORS, type ScheduleCategory } from "@/lib/schedule/categories";
import type { ScheduleInput, TeamMember } from "@/lib/schedule/scheduleStore";
import { LEAVE_TYPE_LABELS, type LeaveType } from "@/lib/leave/annualLeave";

const LEAVE_TYPES: LeaveType[] = ["full", "am", "pm"];

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50";

export function ScheduleForm({
  teamMembers,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  teamMembers: TeamMember[];
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
  const [leaveType, setLeaveType] = useState<LeaveType>(initial.leaveType ?? "full");
  const isLeave = category === "연차";
  const isTeam = category === "홍보부";
  // 홍보부 직원이 한 명뿐이면 미리 골라둔다.
  const [employeeId, setEmployeeId] = useState<string | null>(
    initial.employeeId ?? (teamMembers.length === 1 ? teamMembers[0].id : null)
  );
  const isHalfDay = isLeave && leaveType !== "full";
  // 연차는 내용을 비워도 되게 한다 (비우면 "연차"/"오전 반차" 등으로 저장).
  const canSubmit = isLeave || !!title.trim();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    setErrorMessage(null);
    setIsSaving(true);
    try {
      const finalTitle = title.trim() || (leaveType === "full" ? "연차" : LEAVE_TYPE_LABELS[leaveType]);
      await onSubmit({
        title: finalTitle,
        category,
        startDate,
        endDate: isHalfDay ? startDate : endDate || startDate,
        memo,
        leaveType: isLeave ? leaveType : null,
        employeeId: isTeam ? employeeId : null,
      });
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

      {isLeave ? (
        <div className="flex gap-1" role="radiogroup" aria-label="연차 종류">
          {LEAVE_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              role="radio"
              aria-checked={leaveType === type}
              onClick={() => {
                setLeaveType(type);
                if (type !== "full") setEndDate(startDate);
              }}
              className={`flex min-w-0 flex-1 flex-col items-center rounded-lg border px-1 py-1.5 text-sm font-medium leading-tight ${
                leaveType === type ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              <span className="whitespace-nowrap">{LEAVE_TYPE_LABELS[type]}</span>
              <span className="text-xs font-normal opacity-70">{type === "full" ? "1일" : "0.5일"}</span>
            </button>
          ))}
        </div>
      ) : null}

      {isTeam ? (
        teamMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="담당 직원">
            {teamMembers.map((member) => {
              const active = employeeId === member.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setEmployeeId(active ? null : member.id)}
                  className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-sm font-medium ${
                    active ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:bg-surface-hover"
                  }`}
                >
                  {member.label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted">직원명단에 홍보부 직원이 없어 담당자를 고를 수 없습니다.</p>
        )
      ) : null}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={isLeave ? "내용 (비워두면 '연차'로 저장)" : isTeam ? "내용 (예: 촬영 - 파주 현장)" : "일정 내용"}
        aria-label="일정 내용"
        autoFocus
        className={INPUT_CLASS}
      />

      {/* 패널 폭이 좁아서 날짜는 한 줄에 하나씩 (라벨 왼쪽, 입력칸 오른쪽) */}
      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="w-12 shrink-0">시작일</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              if (isHalfDay || endDate < e.target.value) setEndDate(e.target.value);
            }}
            aria-label="시작일"
            className={`${INPUT_CLASS} min-w-0 flex-1`}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="w-12 shrink-0">종료일</span>
          <input
            type="date"
            value={isHalfDay ? startDate : endDate}
            min={startDate}
            disabled={isHalfDay}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="종료일"
            className={`${INPUT_CLASS} min-w-0 flex-1`}
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
          disabled={isSaving || !canSubmit}
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
