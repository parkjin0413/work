import { addDays, lunarToSolarInYear, weekdayOf } from "./calendar";

// 「관공서의 공휴일에 관한 규정」 기준 양력 고정 공휴일.
// sinceYear: 그 해부터 공휴일. substitute: 토·일요일(또는 다른 공휴일)과 겹치면 대체공휴일.
const FIXED_HOLIDAYS: { md: string; name: string; sinceYear?: number; substitute?: boolean }[] = [
  { md: "01-01", name: "신정" },
  { md: "03-01", name: "삼일절", substitute: true },
  { md: "05-01", name: "노동절", sinceYear: 2026, substitute: true },
  { md: "05-05", name: "어린이날", substitute: true },
  { md: "06-06", name: "현충일" },
  { md: "07-17", name: "제헌절", sinceYear: 2026, substitute: true },
  { md: "08-15", name: "광복절", substitute: true },
  { md: "10-03", name: "개천절", substitute: true },
  { md: "10-09", name: "한글날", substitute: true },
  { md: "12-25", name: "성탄절", substitute: true },
];

// 선거일·임시공휴일처럼 규칙으로 계산할 수 없는 날. 정부가 새로 지정하면 여기에 추가한다.
const MANUAL_HOLIDAYS: Record<string, string> = {
  "2024-04-10": "국회의원선거",
  "2024-10-01": "국군의날 (임시공휴일)",
  "2025-01-27": "임시공휴일",
  "2025-06-03": "대통령선거",
  "2026-06-03": "지방선거",
  "2028-04-12": "국회의원선거",
};

function push(map: Record<string, string[]>, date: string, name: string) {
  const bucket = (map[date] ??= []);
  if (!bucket.includes(name)) bucket.push(name);
}

/** 주말도 아니고 이미 공휴일도 아닌 다음 날을 대체공휴일로 지정한다. */
function addSubstitute(map: Record<string, string[]>, after: string) {
  let candidate = after;
  for (let i = 0; i < 14; i += 1) {
    candidate = addDays(candidate, 1);
    const w = weekdayOf(candidate);
    if (w === 0 || w === 6 || map[candidate]?.length) continue;
    push(map, candidate, "대체공휴일");
    return;
  }
}

/** 한 해의 공휴일 (날짜 → 이름 목록). 설·추석·부처님오신날은 음력으로 자동 계산한다. */
export function getYearHolidays(year: number): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  const substituteTargets: string[] = [];

  for (const { md, name, sinceYear, substitute } of FIXED_HOLIDAYS) {
    if (sinceYear && year < sinceYear) continue;
    push(map, `${year}-${md}`, name);
    if (substitute) substituteTargets.push(`${year}-${md}`);
  }

  for (const [date, name] of Object.entries(MANUAL_HOLIDAYS)) {
    if (date.startsWith(`${year}-`)) push(map, date, name);
  }

  // 설날 (음력 1/1) · 추석 (음력 8/15): 전날·당일·다음날 3일 연휴
  const lunarBreaks: string[][] = [];
  for (const [lm, ld, name] of [
    [1, 1, "설날"],
    [8, 15, "추석"],
  ] as const) {
    const day = lunarToSolarInYear(year, lm, ld);
    if (!day) continue;
    const days = [addDays(day, -1), day, addDays(day, 1)];
    push(map, days[0], `${name} 연휴`);
    push(map, day, name);
    push(map, days[2], `${name} 연휴`);
    lunarBreaks.push(days);
  }

  const buddha = lunarToSolarInYear(year, 4, 8);
  if (buddha) {
    push(map, buddha, "부처님오신날");
    substituteTargets.push(buddha);
  }

  // 설·추석 연휴는 일요일이나 다른 공휴일과 겹칠 때만(토요일은 제외) 연휴 다음 평일에 하루.
  for (const days of lunarBreaks) {
    const overlaps = days.some((d) => weekdayOf(d) === 0 || map[d].length > 1);
    if (overlaps) addSubstitute(map, days[2]);
  }

  // 나머지 대상 공휴일은 토·일요일이나 다른 공휴일과 겹칠 때.
  // 같은 날 두 공휴일이 겹쳐도(예: 2025-05-05 어린이날·부처님오신날) 대체공휴일은 하루뿐이다.
  for (const date of Array.from(new Set(substituteTargets)).sort()) {
    const w = weekdayOf(date);
    if (w === 0 || w === 6 || map[date].length > 1) addSubstitute(map, date);
  }

  return map;
}

/** 해당 월(ym = "YYYY-MM")의 공휴일만 추려서 반환한다. */
export function getMonthHolidays(ym: string): Record<string, string[]> {
  const year = Number(ym.slice(0, 4));
  return Object.fromEntries(Object.entries(getYearHolidays(year)).filter(([date]) => date.startsWith(ym)));
}
