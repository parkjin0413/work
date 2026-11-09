"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import type { ApproverCandidate } from "@/lib/forms/types";
import type { FormState } from "./actions";

/**
 * 서버 액션으로 폼을 보낸다. 실패 문구는 error 로, 보내는 중이면 pending 이 true.
 * 성공하면 액션이 문서 화면으로 이동시킨다(redirect).
 */
export function useActionForm(action: (state: FormState, formData: FormData) => Promise<FormState>) {
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await action(null, formData);
        if (result?.error) setError(result.error);
      } catch (err) {
        // redirect 는 Next 가 처리한다. 혹시 예외로 올라오면 그대로 넘긴다. 그 밖의 실패(세션 만료 등)만 알린다.
        if (String((err as { digest?: unknown })?.digest ?? "").startsWith("NEXT_REDIRECT")) throw err;
        console.error("[forms] 저장 실패:", err);
        setError("저장하지 못했습니다. 다시 로그인했는지 확인하고 잠시 후 다시 시도해주세요.");
      }
    });
  }

  return { error, pending, onSubmit };
}

export const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

export const SMALL_BUTTON_CLASS =
  "rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-40";

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

/** 바꿀 수 없는 값(기안자·부서) 표시 */
export function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <div className={`${INPUT_CLASS} bg-surface-hover text-muted`}>{value || "-"}</div>
    </Field>
  );
}

/** 결재자 선택: 부서별로 묶어서 보여준다. 실제 값은 approver_N hidden input 으로 보낸다. */
export function ApproverSelect({
  order,
  required,
  value,
  onChange,
  candidates,
}: {
  order: number;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  candidates: ApproverCandidate[];
}) {
  const id = `approver-select-${order}`;
  const groups = new Map<string, ApproverCandidate[]>();
  for (const candidate of candidates) {
    const key = candidate.department || "부서 없음";
    groups.set(key, [...(groups.get(key) ?? []), candidate]);
  }
  // 직원명단에서 빠진 사람이 예전 문서에 남아 있으면 선택이 풀린 것으로 보인다.
  const known = !value || candidates.some((c) => c.id === value);

  return (
    <Field label={`${order}차 결재자${required ? "" : " (선택)"}`} htmlFor={id}>
      <select id={id} value={known ? value : ""} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
        <option value="">{required ? "선택" : "선택 안 함"}</option>
        {Array.from(groups.entries()).map(([department, members]) => (
          <optgroup key={department} label={department}>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
                {member.position ? ` (${member.position})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <input type="hidden" name={`approver_${order}`} value={known ? value : ""} />
    </Field>
  );
}

export function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "저장 중..." : label}
    </button>
  );
}

export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {error}
    </p>
  );
}

/** 고른 결재자 id → 미리보기용 결재자 */
export function previewApprovers(ids: string[], candidates: ApproverCandidate[]) {
  return ids.filter(Boolean).map((id, index) => {
    const candidate = candidates.find((c) => c.id === id);
    return { order: index + 1, name: candidate?.name ?? "", jobTitle: candidate?.position ?? "" };
  });
}
