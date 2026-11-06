// 근로기준법 제60조 기준 연차 계산 (입사일 기준, 매월 만근 가정).
//  - 입사 1년 미만: 1개월 개근마다 1일 (최대 11일). 사용기한은 입사일로부터 1년(제60조 제7항 단서).
//  - 입사 1년(출근율 80% 이상): 15일. 이후 매 입사기념일마다 새로 발생하고 1년간 사용.
//  - 3년 이상 근속: 최초 1년을 넘는 근속 2년마다 1일 가산, 최대 25일.
import { addDays, enumerateDates, weekdayOf } from "@/lib/schedule/calendar";
import { getYearHolidays } from "@/lib/schedule/holidays";

export type LeaveType = "full" | "am" | "pm";

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  full: "종일",
  am: "오전 반차",
  pm: "오후 반차",
};

export type LeaveGrant = {
  /** 발생일 */
  date: string;
  /** 사용기한 마지막 날 */
  expires: string;
  days: number;
  kind: "monthly" | "annual";
  label: string;
};

export type LeaveUse = { date: string; days: number; scheduleId: string };

export type LeaveSchedule = {
  id: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType | null;
};

/** "YYYY-MM-DD"에 개월 수를 더한다. 그 달에 같은 날이 없으면 말일로 맞춘다. */
export function addMonthsToDate(dateISO: string, months: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 근속 n년(n ≥ 1)이 되는 날 발생하는 연차 일수. */
export function annualDaysForYear(serviceYears: number): number {
  return Math.min(25, 15 + Math.floor((serviceYears - 1) / 2));
}

/** 입사일부터 until(포함)까지 발생하는 연차 목록. */
export function buildGrants(hireDate: string, until: string): LeaveGrant[] {
  const grants: LeaveGrant[] = [];
  const firstYearEnd = addDays(addMonthsToDate(hireDate, 12), -1);

  for (let month = 1; month <= 11; month += 1) {
    const date = addMonthsToDate(hireDate, month);
    if (date > until) return grants;
    grants.push({ date, expires: firstYearEnd, days: 1, kind: "monthly", label: `월 만근 연차 (${month}개월)` });
  }

  for (let year = 1; ; year += 1) {
    const date = addMonthsToDate(hireDate, year * 12);
    if (date > until) return grants;
    grants.push({
      date,
      expires: addDays(addMonthsToDate(hireDate, (year + 1) * 12), -1),
      days: annualDaysForYear(year),
      kind: "annual",
      label: `${year}년차 연차`,
    });
  }
}

const holidayCache = new Map<number, Record<string, string[]>>();

function isWorkday(date: string): boolean {
  const w = weekdayOf(date);
  if (w === 0 || w === 6) return false;
  const year = Number(date.slice(0, 4));
  if (!holidayCache.has(year)) holidayCache.set(year, getYearHolidays(year));
  return !holidayCache.get(year)![date];
}

/** 연차 일정 하나가 실제로 차감하는 날짜들. 주말·공휴일은 빼고, 반차는 0.5일. */
export function leaveUsesOf(schedule: LeaveSchedule): LeaveUse[] {
  const type = schedule.leaveType ?? "full";
  if (type !== "full") {
    return isWorkday(schedule.startDate) ? [{ date: schedule.startDate, days: 0.5, scheduleId: schedule.id }] : [];
  }
  return enumerateDates(schedule.startDate, schedule.endDate)
    .filter(isWorkday)
    .map((date) => ({ date, days: 1, scheduleId: schedule.id }));
}

export type GrantStatus = LeaveGrant & { used: number; planned: number; remaining: number };

export type LeaveSummary = {
  hireDate: string;
  today: string;
  /** 오늘 쓸 수 있는 연차 묶음 (발생했고 아직 소멸 전) */
  active: GrantStatus[];
  /** 오늘 기준 남은 연차 (이미 쓴 것만 뺌) */
  available: number;
  /** 앞으로 잡아둔 연차까지 뺀 남은 연차 */
  availableAfterPlanned: number;
  usedTotal: number;
  plannedTotal: number;
  /** 연차가 모자라 발생분에서 빼지 못한 사용일 */
  overdrawn: number;
  nextGrant: LeaveGrant | null;
  grants: LeaveGrant[];
};

/**
 * 사용일을 날짜순으로, 그날 쓸 수 있는 연차 중 소멸이 가장 빠른 것부터 차감한다.
 * today 이전(당일 포함) 사용은 "사용", 이후는 "예정"으로 나눠 센다.
 */
export function summarizeLeave(hireDate: string, schedules: LeaveSchedule[], today: string): LeaveSummary {
  const uses = schedules.flatMap(leaveUsesOf).sort((a, b) => a.date.localeCompare(b.date));
  const lastUse = uses.length ? uses[uses.length - 1].date : today;
  const horizon = addMonthsToDate(lastUse > today ? lastUse : today, 12);
  const grants = buildGrants(hireDate, horizon);
  const status: GrantStatus[] = grants.map((g) => ({ ...g, used: 0, planned: 0, remaining: g.days }));

  let overdrawn = 0;
  for (const use of uses) {
    let left = use.days;
    const candidates = status
      .filter((g) => g.date <= use.date && use.date <= g.expires && g.remaining > 0)
      .sort((a, b) => a.expires.localeCompare(b.expires));
    for (const grant of candidates) {
      if (left <= 0) break;
      const take = Math.min(left, grant.remaining);
      grant.remaining -= take;
      if (use.date <= today) grant.used += take;
      else grant.planned += take;
      left -= take;
    }
    overdrawn += left;
  }

  const active = status.filter((g) => g.date <= today && today <= g.expires);
  const usedTotal = uses.filter((u) => u.date <= today).reduce((sum, u) => sum + u.days, 0);
  const plannedTotal = uses.filter((u) => u.date > today).reduce((sum, u) => sum + u.days, 0);

  return {
    hireDate,
    today,
    active,
    available: active.reduce((sum, g) => sum + g.days - g.used, 0),
    availableAfterPlanned: active.reduce((sum, g) => sum + g.remaining, 0),
    usedTotal,
    plannedTotal,
    overdrawn,
    nextGrant: grants.find((g) => g.date > today) ?? null,
    grants,
  };
}

export type LeaveEvent = { id: string; date: string; title: string; detail: string };

/** 달력에 띄울 연차 발생·소멸 일정 (기간 first~last 안). */
export function leaveEventsInRange(summary: LeaveSummary, first: string, last: string): LeaveEvent[] {
  const events: LeaveEvent[] = [];
  const grants = buildGrants(summary.hireDate, addMonthsToDate(last, 12));

  for (const grant of grants) {
    if (grant.date >= first && grant.date <= last) {
      events.push({
        id: `leave-grant-${grant.date}`,
        date: grant.date,
        title: `연차 +${grant.days}일 발생`,
        detail: grant.label,
      });
    }
  }

  // 같은 날 소멸하는 묶음(1년 미만 월 연차 11개 등)은 한 번만 표시한다.
  const expiries = new Map<string, number>();
  for (const grant of grants) expiries.set(grant.expires, (expiries.get(grant.expires) ?? 0) + grant.days);
  for (const [date, days] of Array.from(expiries)) {
    if (date >= first && date <= last) {
      events.push({ id: `leave-expire-${date}`, date, title: "연차 사용기한 마감", detail: `이날까지 발생분 ${days}일` });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}
