const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const WEEKDAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"] as const;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** 서버 타임존과 무관하게 현재 한국 표준시(KST) 기준 날짜를 "YYYY-MM-DD"로 반환한다. */
export function getKstTodayISO(): string {
  const shifted = new Date(Date.now() + KST_OFFSET_MS);
  return toISODate(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

/** "YYYY-MM-DD"에 일수를 더한 새 날짜를 "YYYY-MM-DD"로 반환한다. */
export function addDaysISO(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const base = Date.UTC(y, m - 1, d);
  const next = new Date(base + days * DAY_MS);
  return toISODate(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

/** "YYYY-MM-DD"의 요일 인덱스를 반환한다 (0=월 ... 6=일). */
export function getWeekdayIndex(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 ... 6=토
  return jsDay === 0 ? 6 : jsDay - 1;
}

/** 주어진 날짜가 속한 주의 월요일을 "YYYY-MM-DD"로 반환한다 (0=월 ... 6=일 기준). */
export function getMondayOfISO(dateISO: string): string {
  return addDaysISO(dateISO, -getWeekdayIndex(dateISO));
}

/** "YYYY-MM-DD"가 유효한 월요일 날짜 형식인지 확인한다. */
export function isValidMondayISO(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return getMondayOfISO(value) === value;
}

/** week_start(월요일) 기준 그 주 일요일 날짜를 "YYYY-MM-DD"로 반환한다. */
export function getWeekEndISO(weekStartISO: string): string {
  return addDaysISO(weekStartISO, 6);
}

/** "YYYY-MM-DD"를 "M.D" 형태로 짧게 표시한다. */
export function formatShortDate(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${m}.${d}`;
}

/** "YYYY-MM-DD"를 "M월 D일 (요일)" 형태로 표시한다. */
export function formatMonthDayWeekday(dateISO: string): string {
  const [, m, d] = dateISO.split("-").map(Number);
  return `${m}월 ${d}일 (${WEEKDAY_LABELS[getWeekdayIndex(dateISO)]})`;
}

/** ISO 타임스탬프를 한국 표준시(KST) 기준 "M.D HH:mm" 로 표시한다 (진행 메모 작성시각용). */
export function formatNoteTimestamp(iso: string): string {
  const shifted = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  const m = shifted.getUTCMonth() + 1;
  const d = shifted.getUTCDate();
  return `${m}.${d} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
