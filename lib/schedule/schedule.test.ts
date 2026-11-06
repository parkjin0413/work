import { describe, expect, it } from "vitest";
import { addMonths, lunarToSolarInYear, toLunar } from "./calendar";
import { getMonthHolidays, getYearHolidays } from "./holidays";
import { buildBirthdayOverlays, buildHostingOverlays } from "./overlays";
import { validateScheduleInput } from "./scheduleStore";

describe("음력 변환", () => {
  it("설날·추석을 양력 날짜로 찾는다", () => {
    expect(lunarToSolarInYear(2026, 1, 1)).toBe("2026-02-17");
    expect(lunarToSolarInYear(2026, 8, 15)).toBe("2026-09-25");
    expect(lunarToSolarInYear(2027, 1, 1)).toBe("2027-02-07");
    expect(lunarToSolarInYear(2027, 8, 15)).toBe("2027-09-15");
  });

  it("윤달을 구분한다", () => {
    expect(toLunar("2025-08-01")).toEqual({ month: 6, day: 8, isLeap: true });
    expect(toLunar("2026-09-25")).toEqual({ month: 8, day: 15, isLeap: false });
  });
});

describe("공휴일", () => {
  it("2026년 음력 공휴일과 대체공휴일을 계산한다", () => {
    const h = getYearHolidays(2026);
    expect(h["2026-02-16"]).toEqual(["설날 연휴"]);
    expect(h["2026-02-17"]).toEqual(["설날"]);
    expect(h["2026-05-24"]).toEqual(["부처님오신날"]);
    expect(h["2026-05-25"]).toEqual(["대체공휴일"]); // 부처님오신날이 일요일
    expect(h["2026-08-17"]).toEqual(["대체공휴일"]); // 광복절이 토요일
    expect(h["2026-10-05"]).toEqual(["대체공휴일"]); // 개천절이 토요일
    expect(h["2026-09-28"]).toBeUndefined(); // 추석 연휴(목~토)는 일요일과 안 겹침
  });

  it("2026년 제헌절·노동절이 공휴일이고 삼일절 대체공휴일이 있다", () => {
    const h = getYearHolidays(2026);
    expect(h["2026-07-17"]).toEqual(["제헌절"]);
    expect(h["2026-05-01"]).toEqual(["노동절"]);
    expect(h["2026-03-02"]).toEqual(["대체공휴일"]); // 삼일절이 일요일
  });

  it("2026년 이전에는 제헌절·노동절이 공휴일이 아니다", () => {
    const h = getYearHolidays(2025);
    expect(h["2025-07-17"]).toBeUndefined();
    expect(h["2025-05-01"]).toBeUndefined();
  });

  it("2027년 대체공휴일 7일을 모두 계산한다", () => {
    const h = getYearHolidays(2027);
    const substitutes = Object.keys(h)
      .filter((d) => h[d].includes("대체공휴일"))
      .sort();
    // 설(2/7 일) · 노동절(토) · 제헌절(토) · 광복절(일) · 개천절(일) · 한글날(토) · 성탄절(토)
    expect(substitutes).toEqual([
      "2027-02-09",
      "2027-05-03",
      "2027-07-19",
      "2027-08-16",
      "2027-10-04",
      "2027-10-11",
      "2027-12-27",
    ]);
  });

  it("같은 날 공휴일이 두 개 겹쳐도 대체공휴일은 하루만 둔다", () => {
    const h = getYearHolidays(2025);
    expect(h["2025-05-05"]).toEqual(["어린이날", "부처님오신날"]);
    expect(h["2025-05-06"]).toEqual(["대체공휴일"]);
    expect(h["2025-05-07"]).toBeUndefined();
  });

  it("해당 월만 추린다", () => {
    expect(Object.keys(getMonthHolidays("2026-10")).sort()).toEqual([
      "2026-10-03",
      "2026-10-05",
      "2026-10-09",
    ]);
  });
});

describe("달력에 함께 띄우는 항목", () => {
  it("음력·양력 생일을 해당 날짜에 표시한다", () => {
    const rows = [
      { id: "a", name: "양력직원", birthday_month: 11, birthday_day: 6, birthday_calendar: "solar" },
      // 2026-10-23 = 음력 9/13
      { id: "b", name: "음력직원", birthday_month: 9, birthday_day: 13, birthday_calendar: "lunar" },
    ];
    const items = buildBirthdayOverlays(rows, "2026-10-01", "2026-11-30");
    expect(items.map((i) => [i.date, i.title])).toEqual([
      ["2026-10-23", "생일 · 음력직원"],
      ["2026-11-06", "생일 · 양력직원"],
    ]);
  });

  it("호스팅 만료일 중 기간 안에 있는 것만 고른다", () => {
    const rows = [
      { id: "s1", site_name: "공식", hosting_end_date: "2026-11-20", domain_end_date: "2027-01-01", ssl_end_date: null },
    ];
    const items = buildHostingOverlays(rows, "2026-11-01", "2026-11-30");
    expect(items.map((i) => [i.date, i.title])).toEqual([["2026-11-20", "호스팅 만료 · 공식"]]);
  });
});

describe("일정 입력 검증", () => {
  const base = { title: "거래처 미팅", category: "미팅" as const, startDate: "2026-11-06", endDate: "", memo: " 14시 " };

  it("종료일이 비면 시작일로 채우고 메모를 다듬는다", () => {
    expect(validateScheduleInput(base)).toEqual({ ...base, endDate: "2026-11-06", memo: "14시", leaveType: null });
  });

  it("연차 반차는 하루짜리로 맞춘다", () => {
    const result = validateScheduleInput({ ...base, category: "연차", endDate: "2026-11-09", leaveType: "am" });
    expect(result).toMatchObject({ endDate: "2026-11-06", leaveType: "am" });
  });

  it("종료일이 시작일보다 빠르면 거부한다", () => {
    expect(() => validateScheduleInput({ ...base, endDate: "2026-11-05" })).toThrow("종료일은 시작일보다");
  });

  it("없는 분류는 거부한다", () => {
    expect(() => validateScheduleInput({ ...base, category: "기타" as never })).toThrow("분류");
  });
});

describe("월 이동", () => {
  it("연도를 넘어간다", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});
