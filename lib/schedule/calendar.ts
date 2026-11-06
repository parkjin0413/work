// 달력 계산용 날짜 함수. 모든 날짜는 "YYYY-MM-DD" 문자열, 타임존 영향 없이 UTC 기준으로 계산한다.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function isValidISODate(value: string | undefined | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidYm(value: string | undefined | null): value is string {
  return !!value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 해당 월 1일의 요일 (0=일 ... 6=토). */
export function firstWeekday(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
}

/** "YYYY-MM-DD"의 요일 (0=일 ... 6=토). */
export function weekdayOf(dateISO: string): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(dateISO: string, delta: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return toISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}`;
}

export function monthRange(ym: string): { first: string; last: string } {
  const [y, m] = ym.split("-").map(Number);
  return { first: `${ym}-01`, last: `${ym}-${pad(daysInMonth(y, m))}` };
}

/** start~end(포함) 사이의 모든 날짜. */
export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) dates.push(cur);
  return dates;
}

const lunarFormatter = new Intl.DateTimeFormat("ko-KR-u-ca-dangi", {
  timeZone: "UTC",
  month: "numeric",
  day: "numeric",
});

/**
 * 양력 날짜를 한국 음력(단기력)으로 바꾼다. 윤달이면 isLeap=true.
 * 외부 라이브러리 없이 Node/브라우저 내장 ICU 달력을 쓴다.
 */
export function toLunar(dateISO: string): { month: number; day: number; isLeap: boolean } {
  const parts = lunarFormatter.formatToParts(new Date(`${dateISO}T00:00:00Z`));
  const monthText = parts.find((p) => p.type === "month")?.value ?? "";
  const dayText = parts.find((p) => p.type === "day")?.value ?? "";
  const isLeap = monthText.includes("윤");
  return { month: Number(monthText.replace(/\D/g, "")), day: Number(dayText.replace(/\D/g, "")), isLeap };
}

/** 해당 연도에서 음력 month/day(평달)에 해당하는 양력 날짜. 없으면 null. */
export function lunarToSolarInYear(year: number, lunarMonth: number, lunarDay: number): string | null {
  // 음력 날짜는 양력으로 대략 20~50일 뒤에 온다. 같은 해 1/1~12/31을 훑는다.
  for (let cur = `${year}-01-01`; cur <= `${year}-12-31`; cur = addDays(cur, 1)) {
    const lunar = toLunar(cur);
    if (!lunar.isLeap && lunar.month === lunarMonth && lunar.day === lunarDay) return cur;
  }
  return null;
}
