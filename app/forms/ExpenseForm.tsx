"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ATTACHMENT_TYPES,
  MAX_CONSULTATIONS,
  MAX_EXPENSE_APPROVERS,
  type ApproverCandidate,
  type DrafterProfile,
} from "@/lib/forms/types";
import type { FormState } from "./actions";
import { ExpensePaper } from "./ExpensePaper";
import {
  ApproverSelect,
  Field,
  FormError,
  INPUT_CLASS,
  previewApprovers,
  ReadOnlyField,
  SMALL_BUTTON_CLASS,
  SubmitButton,
  useActionForm,
} from "./FormControls";

type Row = { description: string; vendor: string; amount: string };
const emptyRow = (): Row => ({ description: "", vendor: "", amount: "" });

const formatAmount = (value: string) => (value ? Number(value).toLocaleString("ko-KR") : "");

export type ExpenseFormInitial = {
  draftedAt: string;
  title: string;
  content: string;
  items: Row[];
  consultations: string[];
  instructions: string;
  approverIds: string[];
  attachmentTypes: string[];
  attachmentOther: string;
};

type Props = {
  mode: "create" | "edit";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  drafter: DrafterProfile;
  candidates: ApproverCandidate[];
  stampUrl: string | null;
  cancelHref: string;
  initial: ExpenseFormInitial;
  docNumber?: string;
};

export function ExpenseForm({ mode, action, drafter, candidates, stampUrl, cancelHref, initial, docNumber }: Props) {
  const { error, pending, onSubmit } = useActionForm(action);

  const [draftedAt, setDraftedAt] = useState(initial.draftedAt);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [rows, setRows] = useState<Row[]>(initial.items.length > 0 ? initial.items : [emptyRow()]);
  const [consultations, setConsultations] = useState<string[]>(
    initial.consultations.length > 0 ? initial.consultations : [""]
  );
  const [instructions, setInstructions] = useState(initial.instructions);
  const [attachmentTypes, setAttachmentTypes] = useState<string[]>(initial.attachmentTypes);
  const [attachmentOther, setAttachmentOther] = useState(initial.attachmentOther);
  const [approverIds, setApproverIds] = useState<string[]>(
    Array.from({ length: MAX_EXPENSE_APPROVERS }, (_, i) => initial.approverIds[i] ?? "")
  );

  const total = useMemo(() => rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0), [rows]);

  const updateRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const toggleAttachment = (type: string) =>
    setAttachmentTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));

  return (
    <div>
      <h1 className="mb-5 text-lg font-semibold text-foreground">{mode === "create" ? "품의서 작성" : "품의서 수정"}</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ReadOnlyField label="기안자" value={drafter.name} />
            <ReadOnlyField label="부서" value={drafter.department} />
            <Field label="기안일" htmlFor="expense-drafted-at" className="col-span-2 sm:col-span-1">
              <input
                id="expense-drafted-at"
                type="date"
                name="drafted_at"
                value={draftedAt}
                onChange={(e) => setDraftedAt(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <Field label="제목" htmlFor="expense-title">
            <input
              id="expense-title"
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="예: OOO 구매 비용 지출 건"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="내용" htmlFor="expense-content">
            <div className="mb-2 rounded-lg border border-dashed border-border bg-bg px-3 py-2.5 text-center text-sm text-muted">
              <p>아래와 같이 (보고, 지급)하고자 하오니 재가하여 주시기 바랍니다.</p>
              <p className="mt-1.5 font-semibold tracking-widest">◈ 아 래 ◈</p>
            </div>
            <textarea
              id="expense-content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
              placeholder="이 품의서의 세부 내용을 입력해주세요."
              className={INPUT_CLASS}
            />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">지출 항목</span>
              <button type="button" onClick={() => setRows((prev) => [...prev, emptyRow()])} className={SMALL_BUTTON_CLASS}>
                + 항목 추가
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_8.5rem_auto]"
                >
                  <input
                    type="text"
                    name="item_description"
                    aria-label={`${i + 1}번 품목`}
                    value={row.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                    placeholder="품목"
                    required
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    name="item_vendor"
                    aria-label={`${i + 1}번 거래처`}
                    value={row.vendor}
                    onChange={(e) => updateRow(i, { vendor: e.target.value })}
                    placeholder="거래처"
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    name="item_amount"
                    aria-label={`${i + 1}번 금액`}
                    value={formatAmount(row.amount)}
                    onChange={(e) => updateRow(i, { amount: e.target.value.replace(/[^0-9]/g, "") })}
                    placeholder="금액"
                    required
                    className={`${INPUT_CLASS} text-right`}
                  />
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={rows.length === 1}
                    className={SMALL_BUTTON_CLASS}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-right text-base font-bold text-foreground">합계 {total.toLocaleString("ko-KR")}원</p>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">협의처 (선택, 최대 {MAX_CONSULTATIONS}개)</span>
              <button
                type="button"
                onClick={() => setConsultations((prev) => [...prev, ""])}
                disabled={consultations.length >= MAX_CONSULTATIONS}
                className={SMALL_BUTTON_CLASS}
              >
                + 협의처 추가
              </button>
            </div>
            <div className="space-y-2">
              {consultations.map((value, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    name="consultation_department"
                    aria-label={`${i + 1}번 협의처`}
                    value={value}
                    onChange={(e) =>
                      setConsultations((prev) => prev.map((c, idx) => (idx === i ? e.target.value : c)))
                    }
                    placeholder="협의가 필요한 부서"
                    className={INPUT_CLASS}
                  />
                  <button
                    type="button"
                    onClick={() => setConsultations((prev) => prev.filter((_, idx) => idx !== i))}
                    disabled={consultations.length === 1}
                    className={`shrink-0 ${SMALL_BUTTON_CLASS}`}
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Field label="지시사항 (선택)" htmlFor="expense-instructions">
            <textarea
              id="expense-instructions"
              name="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={2}
              placeholder="결재권자의 지시사항이 있다면 입력하세요."
              className={INPUT_CLASS}
            />
          </Field>

          <div>
            <span className="mb-1 block text-sm font-medium text-muted">증빙 첨부 (선택)</span>
            <p className="mb-2 text-xs text-muted">
              파일은 올리지 않고, 인쇄 후 뒷면에 붙일 서류 종류만 체크합니다. 여러 개를 함께 체크할 수 있습니다.
            </p>
            <div className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {ATTACHMENT_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-1.5 text-sm text-foreground">
                    <input
                      type="checkbox"
                      name="attachment_types"
                      value={type}
                      checked={attachmentTypes.includes(type)}
                      onChange={() => toggleAttachment(type)}
                    />
                    {type}
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="expense-attachment-other" className="shrink-0 text-sm text-muted">
                  기타
                </label>
                <input
                  id="expense-attachment-other"
                  type="text"
                  name="attachment_other"
                  value={attachmentOther}
                  onChange={(e) => setAttachmentOther(e.target.value)}
                  placeholder="직접 입력"
                  className={INPUT_CLASS}
                />
              </div>
            </div>
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-muted">결재선</span>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
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
          <ExpensePaper
            docNumber={docNumber}
            drafterName={drafter.name}
            drafterPosition={drafter.position}
            department={drafter.department}
            draftedAt={draftedAt}
            title={title}
            content={content}
            items={rows
              .filter((row) => row.description || row.amount)
              .map((row) => ({ description: row.description, vendor: row.vendor, amount: Number(row.amount) || 0 }))}
            totalAmount={total}
            consultations={consultations.filter(Boolean)}
            instructions={instructions}
            approvers={previewApprovers(approverIds, candidates)}
            attachmentTypes={attachmentTypes}
            attachmentOther={attachmentOther}
            stampUrl={stampUrl}
          />
        </div>
      </div>
    </div>
  );
}
