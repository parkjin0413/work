"use client";

import Link from "next/link";
import { useState } from "react";
import {
  LEAVE_DAY_OPTIONS,
  LEAVE_TYPES,
  MAX_LEAVE_APPROVERS,
  type ApproverCandidate,
  type DrafterProfile,
  type LeaveBalance,
  type LeaveBalanceEntry,
} from "@/lib/forms/types";
import type { FormState } from "./actions";
import { LeavePaper } from "./LeavePaper";
import {
  ApproverSelect,
  Field,
  FormError,
  INPUT_CLASS,
  previewApprovers,
  ReadOnlyField,
  SubmitButton,
  useActionForm,
} from "./FormControls";

export type LeaveFormInitial = {
  draftedAt: string;
  startDate: string;
  endDate: string;
  days: string;
  leaveType: string;
  reason: string;
  substituteJobTitle: string;
  substituteName: string;
  leaveBalance: LeaveBalance;
  approverIds: string[];
};

type Props = {
  mode: "create" | "edit";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  drafter: DrafterProfile;
  candidates: ApproverCandidate[];
  stampUrl: string | null;
  cancelHref: string;
  initial: LeaveFormInitial;
  docNumber?: string;
};

const BALANCE_ROWS = [
  { key: "annual", label: "연차" },
  { key: "substitute", label: "대체휴가" },
] as const;

const BALANCE_COLUMNS: { field: keyof LeaveBalanceEntry; name: string; label: string }[] = [
  { field: "total", name: "total", label: "전체일수" },
  { field: "priorUsed", name: "prior", label: "전일까지 누계" },
  { field: "used", name: "used", label: "사용일" },
  { field: "remaining", name: "remaining", label: "잔여일" },
];

export function LeaveForm({ mode, action, drafter, candidates, stampUrl, cancelHref, initial, docNumber }: Props) {
  const { error, pending, onSubmit } = useActionForm(action);

  const [draftedAt, setDraftedAt] = useState(initial.draftedAt);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [days, setDays] = useState(initial.days);
  const [leaveType, setLeaveType] = useState(initial.leaveType);
  const [reason, setReason] = useState(initial.reason);
  const [substituteJobTitle, setSubstituteJobTitle] = useState(initial.substituteJobTitle);
  const [substituteName, setSubstituteName] = useState(initial.substituteName);
  const [balance, setBalance] = useState<LeaveBalance>(initial.leaveBalance);
  const [approverIds, setApproverIds] = useState<string[]>(
    Array.from({ length: MAX_LEAVE_APPROVERS }, (_, i) => initial.approverIds[i] ?? "")
  );

  const updateBalance = (row: keyof LeaveBalance, field: keyof LeaveBalanceEntry, value: string) =>
    setBalance((prev) => ({ ...prev, [row]: { ...prev[row], [field]: value } }));

  // 시작일을 종료일보다 뒤로 옮기면 종료일도 같이 옮긴다.
  const changeStartDate = (value: string) => {
    setStartDate(value);
    if (value && endDate && endDate < value) setEndDate(value);
  };

  return (
    <div>
      <h1 className="mb-5 text-lg font-semibold text-foreground">
        {mode === "create" ? "휴가신청서 작성" : "휴가신청서 수정"}
      </h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ReadOnlyField label="기안자" value={drafter.name} />
            <ReadOnlyField label="부서" value={drafter.department} />
            <Field label="기안일" htmlFor="leave-drafted-at">
              <input
                id="leave-drafted-at"
                type="date"
                name="drafted_at"
                value={draftedAt}
                onChange={(e) => setDraftedAt(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="휴가기간 (시작일)" htmlFor="leave-start">
              <input
                id="leave-start"
                type="date"
                name="start_date"
                value={startDate}
                onChange={(e) => changeStartDate(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="휴가기간 (종료일)" htmlFor="leave-end">
              <input
                id="leave-end"
                type="date"
                name="end_date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="신청일수" htmlFor="leave-days">
              <select
                id="leave-days"
                name="days"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="" disabled>
                  선택
                </option>
                {LEAVE_DAY_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}일
                  </option>
                ))}
              </select>
            </Field>
            <Field label="휴가종류" htmlFor="leave-type">
              <select
                id="leave-type"
                name="leave_type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="" disabled>
                  선택
                </option>
                {LEAVE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="휴가사유" htmlFor="leave-reason">
            <textarea
              id="leave-reason"
              name="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              placeholder="특이사항이 없으면 '개인 사정'으로 적어주세요."
              className={INPUT_CLASS}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="업무 대행자 직위 (선택)" htmlFor="leave-sub-title">
              <input
                id="leave-sub-title"
                type="text"
                name="substitute_job_title"
                value={substituteJobTitle}
                onChange={(e) => setSubstituteJobTitle(e.target.value)}
                placeholder="없으면 비워두세요 (x로 표시)"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="업무 대행자 성명 (선택)" htmlFor="leave-sub-name">
              <input
                id="leave-sub-name"
                type="text"
                name="substitute_name"
                value={substituteName}
                onChange={(e) => setSubstituteName(e.target.value)}
                placeholder="없으면 비워두세요 (x로 표시)"
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-muted">연차/대체휴가 현황 (선택, 직접 입력)</span>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[30rem] text-center text-sm">
                <thead>
                  <tr className="bg-surface-hover text-muted">
                    <th className="px-2 py-2 font-medium">구분</th>
                    {BALANCE_COLUMNS.map((column) => (
                      <th key={column.field} className="px-2 py-2 font-medium">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {BALANCE_ROWS.map(({ key, label }) => (
                    <tr key={key}>
                      <th className="px-2 py-2 font-medium text-muted">{label}</th>
                      {BALANCE_COLUMNS.map((column) => (
                        <td key={column.field} className="px-2 py-2">
                          <input
                            type="text"
                            name={`balance_${key}_${column.name}`}
                            aria-label={`${label} ${column.label}`}
                            value={balance[key][column.field]}
                            onChange={(e) => updateBalance(key, column.field, e.target.value)}
                            className={`${INPUT_CLASS} text-center`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-muted">소속결재선</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {approverIds.map((value, i) => (
                <ApproverSelect
                  key={i}
                  order={i + 1}
                  required={i === 0}
                  value={value}
                  onChange={(next) => setApproverIds((prev) => prev.map((v, idx) => (idx === i ? next : v)))}
                  candidates={candidates}
                />
              ))}
            </div>
          </div>

          <FormError error={error} />

          <div className="flex items-center gap-4 pt-1">
            <SubmitButton label={mode === "create" ? "작성 완료" : "수정하기"} pending={pending} />
            <Link href={cancelHref} className="text-sm text-muted hover:text-foreground">
              취소
            </Link>
          </div>
        </form>

        <div className="xl:sticky xl:top-20">
          <p className="mb-2 text-sm font-medium text-muted">미리보기</p>
          <LeavePaper
            docNumber={docNumber}
            drafterName={drafter.name}
            drafterPosition={drafter.position}
            department={drafter.department}
            draftedAt={draftedAt}
            startDate={startDate}
            endDate={endDate}
            days={days}
            leaveType={leaveType}
            reason={reason}
            substituteJobTitle={substituteJobTitle}
            substituteName={substituteName}
            leaveBalance={balance}
            approvers={previewApprovers(approverIds, candidates)}
            stampUrl={stampUrl}
          />
        </div>
      </div>
    </div>
  );
}
