import { describe, expect, it } from "vitest";
import {
  addMonthsToDate,
  annualDaysForYear,
  buildGrants,
  leaveEventsInRange,
  leaveUsesOf,
  summarizeLeave,
} from "./annualLeave";

const HIRE = "2026-09-01";

describe("연차 발생 (근로기준법 제60조)", () => {
  it("1년 미만은 매월 만근 시 1일씩, 최대 11일. 사용기한은 입사 1년까지", () => {
    const grants = buildGrants(HIRE, "2027-08-31");
    expect(grants).toHaveLength(11);
    expect(grants[0]).toMatchObject({ date: "2026-10-01", days: 1, expires: "2027-08-31" });
    expect(grants[10]).toMatchObject({ date: "2027-08-01", days: 1, expires: "2027-08-31" });
  });

  it("입사 1년이 되는 날 15일, 1년간 사용", () => {
    const grants = buildGrants(HIRE, "2027-09-01");
    expect(grants[11]).toMatchObject({ date: "2027-09-01", days: 15, expires: "2028-08-31", kind: "annual" });
  });

  it("3년 이상 근속하면 2년마다 1일 가산, 최대 25일", () => {
    expect([1, 2, 3, 4, 5, 21, 30].map(annualDaysForYear)).toEqual([15, 15, 16, 16, 17, 25, 25]);
  });

  it("말일 입사도 다음 달 말일로 맞춘다", () => {
    expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28");
  });
});

describe("연차 사용일 계산", () => {
  it("종일 연차는 주말·공휴일을 빼고 센다", () => {
    // 2026-12-24(목) ~ 12-28(월): 25일 성탄절, 26·27 주말 → 24, 28 이틀
    const uses = leaveUsesOf({ id: "a", startDate: "2026-12-24", endDate: "2026-12-28", leaveType: "full" });
    expect(uses.map((u) => u.date)).toEqual(["2026-12-24", "2026-12-28"]);
  });

  it("반차는 0.5일", () => {
    const uses = leaveUsesOf({ id: "a", startDate: "2026-11-20", endDate: "2026-11-20", leaveType: "am" });
    expect(uses).toEqual([{ date: "2026-11-20", days: 0.5, scheduleId: "a" }]);
  });
});

describe("연차 현황", () => {
  it("2026-11-06 기준: 2일 발생, 다음 발생은 12/1", () => {
    const s = summarizeLeave(HIRE, [], "2026-11-06");
    expect(s.available).toBe(2);
    expect(s.nextGrant).toMatchObject({ date: "2026-12-01", days: 1 });
  });

  it("사용·예정을 나눠 빼고, 발생보다 많이 잡으면 초과로 알린다", () => {
    const schedules = [
      { id: "past", startDate: "2026-10-15", endDate: "2026-10-15", leaveType: "pm" as const },
      { id: "future", startDate: "2026-11-20", endDate: "2026-11-20", leaveType: "full" as const },
      { id: "too-many", startDate: "2026-11-23", endDate: "2026-11-25", leaveType: "full" as const },
    ];
    const s = summarizeLeave(HIRE, schedules, "2026-11-06");
    expect(s.usedTotal).toBe(0.5);
    expect(s.plannedTotal).toBe(4);
    expect(s.available).toBe(1.5);
    expect(s.availableAfterPlanned).toBe(0);
    // 11월 말까지 발생 2일 중 0.5 사용 → 1.5일만 남아 4일 예정 중 2.5일 초과
    expect(s.overdrawn).toBe(2.5);
  });

  it("1년차 15일 발생 후에는 1년 미만분이 소멸하고 15일 기준으로 계산한다", () => {
    const s = summarizeLeave(HIRE, [], "2027-09-02");
    expect(s.available).toBe(15);
    expect(s.active).toHaveLength(1);
  });
});

describe("달력용 연차 일정", () => {
  it("발생일과 사용기한 마감일을 표시한다", () => {
    const s = summarizeLeave(HIRE, [], "2026-11-06");
    const events = leaveEventsInRange(s, "2027-08-01", "2027-09-30");
    expect(events.map((e) => [e.date, e.title])).toEqual([
      ["2027-08-01", "연차 +1일 발생"],
      ["2027-08-31", "연차 사용기한 마감"],
      ["2027-09-01", "연차 +15일 발생"],
    ]);
  });
});
