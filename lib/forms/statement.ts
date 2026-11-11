import { isValidISODate } from "@/lib/schedule/calendar";
import type { Parsed } from "./parse";

/**
 * 경비내역서. 회사 양식(엑셀)을 그대로 옮긴 것으로, 한 장에 내역 18줄.
 * 줄은 두 종류다.
 *   - 일반: 식대·주차비·하이패스 등. 금액을 직접 적는다.
 *   - 자차: 내 차로 외근. 거리(km)만 적으면 "거리 ÷ 10(연비 10km/L) × 그 달 최고 주유 단가 × 110%" 로 계산한다.
 *     단가는 문서에 하나만 적고 모든 자차 줄에 같이 쓴다.
 */
export const STATEMENT_MAX_ROWS = 18;
/** 자차 비고 칸에 찍히는 문구 */
export const CAR_NOTE = "110%";

export type StatementRowKind = "general" | "car";

export type StatementRow = {
  kind: StatementRowKind;
  /** YYYY-MM-DD */
  date: string;
  description: string;
  /** 원. 자차는 거리·단가로 계산한 값 */
  amount: number;
  /** 자차 거리(km). 일반은 null */
  distance: number | null;
  /** 비고. 자차는 "110%" */
  note: string;
};

export type ExpenseStatement = {
  id: string;
  drafterName: string;
  drafterPosition: string;
  writtenAt: string;
  /** 그 달 가장 높게 주유한 단가(원/L). 자차 줄이 없으면 null */
  fuelPrice: number | null;
  rows: StatementRow[];
  totalAmount: number;
  createdAt: string;
};

export type ExpenseStatementSummary = Pick<ExpenseStatement, "id" | "writtenAt" | "totalAmount"> & {
  firstDate: string | null;
  lastDate: string | null;
  rowCount: number;
};

/** 자차 금액: 거리 ÷ 10 × 단가 × 1.1, 원 단위 반올림 (예: 73km, 1,869원 → 15,008원) */
export function carAmount(distance: number, fuelPrice: number): number {
  if (!(distance > 0) || !(fuelPrice > 0)) return 0;
  // 0.1 단위 거리와 1.1 을 곱할 때 생기는 부동소수 오차를 정수 연산으로 피한다.
  return Math.round((Math.round(distance * 10) * fuelPrice * 11) / 1000);
}

export function sumRows(rows: Pick<StatementRow, "amount">[]): number {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

const DIGITS = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"];
const SMALL_UNITS = ["", "십", "백", "천"];
const BIG_UNITS = ["", "만", "억", "조"];

/** 106852 → "일십만육천팔백오십이" (결재 서류 표기: 일십·일백·일천처럼 "일"을 붙인다) */
export function toKoreanAmount(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "영";
  let result = "";
  const groups = String(n)
    .split("")
    .reverse()
    .join("")
    .match(/.{1,4}/g)!
    .map((g) => g.split("").reverse().join(""));
  for (let gi = groups.length - 1; gi >= 0; gi -= 1) {
    const group = groups[gi].padStart(4, "0");
    let part = "";
    for (let i = 0; i < 4; i += 1) {
      const d = Number(group[i]);
      if (d) part += DIGITS[d] + SMALL_UNITS[3 - i];
    }
    if (part) result += part + BIG_UNITS[gi];
  }
  return result;
}

/** "一金 일금일십만육천팔백오십이원整" 의 오른쪽 부분 */
export function koreanAmountPhrase(value: number): string {
  return `일금${toKoreanAmount(value)}원整`;
}

/** "2026-10-02" → "10월 02일" */
export function formatRowDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return m && d ? `${Number(m)}월 ${d}일` : "";
}

/** "2026-11-02" → "2026.11.02" */
export function formatWrittenAt(iso: string): string {
  return iso.replace(/-/g, ".");
}

// ── 폼 읽기 ────────────────────────────────────────────

export type StatementFields = {
  writtenAt: string;
  fuelPrice: number | null;
  rows: StatementRow[];
  totalAmount: number;
};

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const numberText = (value: string) => value.replace(/[,\s원]/g, "");

/**
 * 폼 값 → 경비내역서. 줄은 row_kind / row_date / row_description / row_amount / row_distance / row_note 를
 * 같은 순서로 여러 개 보낸다. 완전히 빈 줄은 건너뛴다. 저장할 때 날짜순으로 정렬한다(같은 날짜는 적은 순서).
 */
export function parseStatementFields(formData: FormData): Parsed<StatementFields> {
  const writtenAt = text(formData, "written_at");
  if (!isValidISODate(writtenAt)) return { ok: false, error: "작성일을 입력해주세요." };

  const fuelText = numberText(text(formData, "fuel_price"));
  const fuelPrice = fuelText ? Number(fuelText) : null;
  if (fuelPrice !== null && !(Number.isInteger(fuelPrice) && fuelPrice > 0)) {
    return { ok: false, error: "주유 단가는 원 단위 숫자로 입력해주세요." };
  }

  const kinds = formData.getAll("row_kind").map(String);
  const dates = formData.getAll("row_date").map(String);
  const descriptions = formData.getAll("row_description").map(String);
  const amounts = formData.getAll("row_amount").map(String);
  const distances = formData.getAll("row_distance").map(String);
  const notes = formData.getAll("row_note").map(String);

  const rows: StatementRow[] = [];
  for (let i = 0; i < kinds.length; i += 1) {
    const kind: StatementRowKind = kinds[i] === "car" ? "car" : "general";
    const date = (dates[i] ?? "").trim();
    const description = (descriptions[i] ?? "").trim();
    const amountText = numberText(amounts[i] ?? "");
    const distanceText = numberText(distances[i] ?? "");
    const note = (notes[i] ?? "").trim();
    // 날짜만 있는 줄(새 줄 기본 날짜)은 빈 줄로 본다
    const empty = !description && !(kind === "car" ? distanceText : amountText);
    if (empty) continue;

    const label = `${i + 1}번 줄`;
    if (!isValidISODate(date)) return { ok: false, error: `${label}의 날짜를 입력해주세요.` };
    if (!description) return { ok: false, error: `${label}의 내용을 입력해주세요.` };

    if (kind === "car") {
      const distance = Number(distanceText);
      if (!distanceText || !(distance > 0) || !Number.isFinite(distance)) {
        return { ok: false, error: `${label}의 거리(km)를 입력해주세요.` };
      }
      if (fuelPrice === null) return { ok: false, error: "자차 줄이 있으면 주유 단가를 입력해주세요." };
      const rounded = Math.round(distance * 10) / 10;
      rows.push({ kind, date, description, distance: rounded, amount: carAmount(rounded, fuelPrice), note: CAR_NOTE });
    } else {
      const amount = Number(amountText);
      if (!amountText || !Number.isSafeInteger(amount) || amount < 0) {
        return { ok: false, error: `${label}의 금액을 확인해주세요.` };
      }
      rows.push({ kind, date, description, distance: null, amount, note });
    }
  }

  if (rows.length === 0) return { ok: false, error: "내역을 1줄 이상 입력해주세요." };
  if (rows.length > STATEMENT_MAX_ROWS) {
    return { ok: false, error: `한 장에는 ${STATEMENT_MAX_ROWS}줄까지 들어갑니다. 나눠서 작성해주세요.` };
  }

  const sorted = rows
    .map((row, index) => ({ row, index }))
    .sort((a, b) => a.row.date.localeCompare(b.row.date) || a.index - b.index)
    .map(({ row }) => row);

  return {
    ok: true,
    value: {
      writtenAt,
      fuelPrice,
      rows: sorted,
      totalAmount: sumRows(sorted),
    },
  };
}

// ── 자동완성 ────────────────────────────────────────────

/** 지난 경비내역서에서 모은 줄 후보. 고르면 종류와 거리(자차) 또는 금액(일반)까지 채운다. */
export type StatementSuggestion = {
  description: string;
  kind: StatementRowKind;
  distance: number | null;
  amount: number;
  note: string;
  /** 지금까지 쓴 횟수 */
  count: number;
};

/**
 * 같은 내용끼리 묶어 가장 최근 값(종류·거리·금액)을 쓰고, 자주 쓴 순 → 최근 순으로 정렬한다.
 * statements 는 최신 문서가 앞에 오도록 넘긴다.
 */
export function buildSuggestions(statements: { rows: StatementRow[] }[], limit = 200): StatementSuggestion[] {
  const byDescription = new Map<string, StatementSuggestion & { order: number }>();
  let order = 0;
  for (const statement of statements) {
    // 한 문서 안에서는 아래 줄(뒤 날짜)이 더 최근
    for (const row of [...statement.rows].reverse()) {
      const description = row.description.trim();
      if (!description) continue;
      const found = byDescription.get(description);
      if (found) {
        found.count += 1;
        continue;
      }
      byDescription.set(description, {
        description,
        kind: row.kind,
        distance: row.kind === "car" ? row.distance : null,
        amount: row.kind === "car" ? 0 : row.amount,
        note: row.kind === "car" ? "" : row.note,
        count: 1,
        order: order++,
      });
    }
  }
  return Array.from(byDescription.values())
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, limit)
    .map(({ order: _order, ...rest }) => rest);
}

/** 작성일 기준 지난달 1일 ("2026-11-02" → "2026-10-01"). 경비내역서는 보통 지난달 것을 쓴다. */
export function previousMonthStart(writtenAt: string): string {
  const [y, m] = writtenAt.split("-").map(Number);
  if (!y || !m) return "";
  const year = m === 1 ? y - 1 : y;
  const month = m === 1 ? 12 : m - 1;
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
