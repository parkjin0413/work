"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Car, Copy, Receipt, X } from "lucide-react";
import type { DrafterProfile } from "@/lib/forms/types";
import {
  CAR_NOTE,
  carAmount,
  STATEMENT_MAX_ROWS,
  sumRows,
  type StatementRow,
  type StatementRowKind,
  type StatementSuggestion,
} from "@/lib/forms/statement";
import type { FormState } from "./actions";
import { StatementPaper } from "./StatementPaper";
import {
  Field,
  FormError,
  INPUT_CLASS,
  ReadOnlyField,
  SMALL_BUTTON_CLASS,
  SubmitButton,
  useActionForm,
} from "./FormControls";

/** 입력 중인 한 줄 (숫자는 입력 그대로 문자열로 둔다) */
type DraftRow = {
  key: number;
  kind: StatementRowKind;
  date: string;
  description: string;
  amount: string;
  distance: string;
  note: string;
};

export type StatementFormInitial = {
  writtenAt: string;
  fuelPrice: string;
  rows: Omit<DraftRow, "key">[];
};

type Props = {
  mode: "create" | "edit";
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  drafter: DrafterProfile;
  stampUrl: string | null;
  cancelHref: string;
  initial: StatementFormInitial;
  /** 지난 경비내역서에서 모은 자동완성 후보 */
  suggestions?: StatementSuggestion[];
};

let nextKey = 1;
const emptyRow = (date = "", kind: StatementRowKind = "general"): DraftRow => ({
  key: nextKey++,
  kind,
  date,
  description: "",
  amount: "",
  distance: "",
  note: "",
});

const digits = (value: string) => value.replace(/[^0-9]/g, "");
const won = (value: string) => (value ? Number(value).toLocaleString("ko-KR") : "");

/** 입력 중인 줄 → 미리보기·합계용 줄 (빈 줄은 뺀다) */
function toRows(rows: DraftRow[], fuelPrice: number): StatementRow[] {
  return rows
    .filter((r) => r.description || (r.kind === "car" ? r.distance : r.amount))
    .map((r) => {
      const distance = Number(r.distance) || 0;
      return r.kind === "car"
        ? {
            kind: r.kind,
            date: r.date,
            description: r.description,
            amount: carAmount(distance, fuelPrice),
            distance,
            note: CAR_NOTE,
          }
        : {
            kind: r.kind,
            date: r.date,
            description: r.description,
            amount: Number(r.amount) || 0,
            distance: null,
            note: r.note,
          };
    })
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.date || "9").localeCompare(b.row.date || "9") || a.index - b.index)
    .map(({ row }) => row);
}

export function StatementForm({ mode, action, drafter, stampUrl, cancelHref, initial, suggestions = [] }: Props) {
  const { error, pending, onSubmit } = useActionForm(action);
  const [writtenAt, setWrittenAt] = useState(initial.writtenAt);
  const [fuelPrice, setFuelPrice] = useState(initial.fuelPrice);
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initial.rows.length > 0 ? initial.rows.map((r) => ({ ...r, key: nextKey++ })) : [emptyRow()],
  );

  const price = Number(fuelPrice) || 0;
  const previewRows = useMemo(() => toRows(rows, price), [rows, price]);
  const total = sumRows(previewRows);
  const hasCar = rows.some((r) => r.kind === "car");

  const update = (key: number, patch: Partial<DraftRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const addRow = (kind: StatementRowKind) =>
    setRows((prev) => [...prev, emptyRow(prev[prev.length - 1]?.date ?? "", kind)]);

  /** 같은 줄을 바로 아래에 하나 더 (같은 경로를 여러 번 간 날, 같은 식대 등) */
  const duplicateRow = (key: number) =>
    setRows((prev) => {
      if (prev.length >= STATEMENT_MAX_ROWS) return prev;
      const index = prev.findIndex((r) => r.key === key);
      if (index < 0) return prev;
      const copy = { ...prev[index], key: nextKey++ };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  const suggestionByText = useMemo(() => new Map(suggestions.map((s) => [s.description, s])), [suggestions]);

  /** 내용을 바꿀 때 지난 내역과 똑같으면 종류와 거리/금액을 채운다 (이미 적은 값은 그대로 둔다) */
  const changeDescription = (row: DraftRow, description: string) => {
    const found = suggestionByText.get(description.trim());
    if (!found) return update(row.key, { description });
    update(row.key, {
      description,
      kind: found.kind,
      ...(found.kind === "car"
        ? { distance: row.kind === "car" && row.distance ? row.distance : String(found.distance ?? "") }
        : {
            amount: row.kind === "general" && row.amount ? row.amount : String(found.amount || ""),
            note: row.note || found.note,
          }),
    });
  };

  return (
    <div>
      <h1 className="mb-5 text-lg font-semibold text-foreground">
        {mode === "create" ? "경비내역서 작성" : "경비내역서 수정"}
      </h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2 xl:items-start">
        <form onSubmit={onSubmit} className="space-y-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ReadOnlyField label="작성자" value={[drafter.name, drafter.position].filter(Boolean).join(" ")} />
            <Field label="작성일" htmlFor="statement-written-at">
              <input
                id="statement-written-at"
                type="date"
                name="written_at"
                value={writtenAt}
                onChange={(e) => setWrittenAt(e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="주유 단가 (원/L)" htmlFor="statement-fuel-price" className="col-span-2 sm:col-span-1">
              <input
                id="statement-fuel-price"
                type="text"
                inputMode="numeric"
                name="fuel_price"
                value={won(fuelPrice)}
                onChange={(e) => setFuelPrice(digits(e.target.value))}
                placeholder={hasCar ? "그 달 가장 높게 주유한 단가" : "자차 줄이 있을 때만"}
                className={`${INPUT_CLASS} text-right`}
              />
            </Field>
          </div>

          <div className="rounded-lg bg-bg px-3 py-2 text-xs leading-relaxed text-muted">
            <p>
              <b className="text-foreground">일반</b>: 식대·주차비·하이패스 등. 금액을 직접 적습니다.
            </p>
            <p>
              <b className="text-foreground">자차</b>: 거리(km)만 적으면 <b>거리 ÷ 10 × 주유 단가 × 110%</b> 로 금액이
              자동 계산되고 비고에 110% 가 들어갑니다.
            </p>
            {suggestions.length > 0 ? (
              <p>
                내용 칸에 몇 글자만 치면 <b className="text-foreground">지난 내역</b>이 뜹니다. 고르면 거리·금액까지
                채워집니다.
              </p>
            ) : null}
            <p>저장하면 날짜순으로 정렬됩니다. 한 장에 {STATEMENT_MAX_ROWS}줄까지 들어갑니다.</p>
          </div>

          <ol className="space-y-2">
            {rows.map((row, index) => {
              const isCar = row.kind === "car";
              const computed = isCar ? carAmount(Number(row.distance) || 0, price) : 0;
              return (
                <li key={row.key} className="rounded-xl border border-border p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="w-6 text-sm font-semibold text-muted">{index + 1}</span>
                    <div role="radiogroup" aria-label={`${index + 1}번 줄 종류`} className="flex gap-1">
                      {(
                        [
                          ["general", "일반", Receipt],
                          ["car", "자차", Car],
                        ] as const
                      ).map(([kind, label, Icon]) => (
                        <button
                          key={kind}
                          type="button"
                          role="radio"
                          aria-checked={row.kind === kind}
                          onClick={() => update(row.key, { kind })}
                          className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                            row.kind === kind
                              ? "border-accent bg-accent/10 text-accent"
                              : "border-border text-muted hover:text-foreground"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => duplicateRow(row.key)}
                      disabled={rows.length >= STATEMENT_MAX_ROWS}
                      aria-label={`${index + 1}번 줄 복사`}
                      title="같은 줄을 아래에 하나 더"
                      className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-muted hover:bg-bg hover:text-foreground disabled:opacity-30"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      복사
                    </button>
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                      disabled={rows.length === 1}
                      aria-label={`${index + 1}번 줄 삭제`}
                      className="rounded p-1 text-muted hover:bg-bg hover:text-danger disabled:opacity-30"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>

                  <input type="hidden" name="row_kind" value={row.kind} />
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                    <input
                      type="date"
                      name="row_date"
                      aria-label={`${index + 1}번 날짜`}
                      value={row.date}
                      onChange={(e) => update(row.key, { date: e.target.value })}
                      className={INPUT_CLASS}
                    />
                    <input
                      type="text"
                      name="row_description"
                      aria-label={`${index + 1}번 내용`}
                      value={row.description}
                      onChange={(e) => changeDescription(row, e.target.value)}
                      list={suggestions.length > 0 ? "statement-suggestions" : undefined}
                      autoComplete="off"
                      placeholder={
                        isCar ? "예: 양주 사무실(회암동) → 서울 사무실(창동)" : "예: 코엑스 주차비 (전시회 설치)"
                      }
                      className={`${INPUT_CLASS} col-span-2 sm:col-span-1`}
                    />
                  </div>

                  {isCar ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input type="hidden" name="row_amount" value="" />
                      <input type="hidden" name="row_note" value="" />
                      <input
                        type="text"
                        inputMode="decimal"
                        name="row_distance"
                        aria-label={`${index + 1}번 거리(km)`}
                        value={row.distance}
                        onChange={(e) => update(row.key, { distance: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder="거리"
                        className={`${INPUT_CLASS} !w-28 text-right`}
                      />
                      <span className="text-sm text-muted">km</span>
                      <span className="text-sm text-muted" aria-live="polite">
                        {price > 0 ? (
                          <>
                            → <b className="text-foreground">{computed.toLocaleString("ko-KR")}원</b> (110%)
                          </>
                        ) : (
                          "주유 단가를 입력하면 금액이 계산됩니다"
                        )}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                      <input type="hidden" name="row_distance" value="" />
                      <input
                        type="text"
                        inputMode="numeric"
                        name="row_amount"
                        aria-label={`${index + 1}번 금액`}
                        value={won(row.amount)}
                        onChange={(e) => update(row.key, { amount: digits(e.target.value) })}
                        placeholder="금액"
                        className={`${INPUT_CLASS} text-right`}
                      />
                      <input
                        type="text"
                        name="row_note"
                        aria-label={`${index + 1}번 비고`}
                        value={row.note}
                        onChange={(e) => update(row.key, { note: e.target.value })}
                        placeholder="비고 (선택)"
                        className={INPUT_CLASS}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {/* 지난 경비내역서의 줄: 내용 칸에서 고르면 종류·거리·금액이 채워진다 */}
          {suggestions.length > 0 ? (
            <datalist id="statement-suggestions">
              {suggestions.map((s) => (
                <option
                  key={s.description}
                  value={s.description}
                  label={s.kind === "car" ? `자차 ${s.distance ?? ""}km` : `${s.amount.toLocaleString("ko-KR")}원`}
                />
              ))}
            </datalist>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => addRow("general")}
              disabled={rows.length >= STATEMENT_MAX_ROWS}
              className={SMALL_BUTTON_CLASS}
            >
              + 일반 줄
            </button>
            <button
              type="button"
              onClick={() => addRow("car")}
              disabled={rows.length >= STATEMENT_MAX_ROWS}
              className={SMALL_BUTTON_CLASS}
            >
              + 자차 줄
            </button>
            <span className="ml-auto text-base font-bold text-foreground">합계 {total.toLocaleString("ko-KR")}원</span>
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
          <StatementPaper
            drafterName={drafter.name}
            drafterPosition={drafter.position}
            writtenAt={writtenAt}
            fuelPrice={price || null}
            rows={previewRows}
            totalAmount={total}
            stampUrl={stampUrl}
          />
        </div>
      </div>
    </div>
  );
}
