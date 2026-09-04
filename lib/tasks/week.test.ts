import { describe, it, expect } from "vitest";
import {
  addDaysISO,
  getMondayOfISO,
  getWeekEndISO,
  isValidMondayISO,
  formatShortDate,
  formatMonthDayWeekday,
} from "./week";

describe("addDaysISO", () => {
  it("일수를 더한다", () => {
    expect(addDaysISO("2026-09-01", 6)).toBe("2026-09-07");
  });

  it("월을 넘어가는 경우도 처리한다", () => {
    expect(addDaysISO("2026-09-28", 6)).toBe("2026-10-04");
  });

  it("음수 일수(과거)도 처리한다", () => {
    expect(addDaysISO("2026-09-01", -7)).toBe("2026-08-25");
  });
});

describe("getMondayOfISO", () => {
  it("화요일이면 하루 전 월요일을 반환한다 (2026-09-01은 화요일)", () => {
    expect(getMondayOfISO("2026-09-01")).toBe("2026-08-31");
  });

  it("이미 월요일이면 그대로 반환한다 (2026-08-31은 월요일)", () => {
    expect(getMondayOfISO("2026-08-31")).toBe("2026-08-31");
  });

  it("주 중간 날짜는 해당 주의 월요일을 반환한다 (2026-09-03 목요일)", () => {
    expect(getMondayOfISO("2026-09-03")).toBe("2026-08-31");
  });

  it("일요일이면 그 주(6일 전) 월요일을 반환한다 (2026-09-06 일요일)", () => {
    expect(getMondayOfISO("2026-09-06")).toBe("2026-08-31");
  });
});

describe("isValidMondayISO", () => {
  it("월요일 날짜는 유효하다", () => {
    expect(isValidMondayISO("2026-08-31")).toBe(true);
  });

  it("월요일이 아닌 날짜는 무효하다", () => {
    expect(isValidMondayISO("2026-09-03")).toBe(false);
  });

  it("형식이 잘못되면 무효하다", () => {
    expect(isValidMondayISO("2026/08/31")).toBe(false);
    expect(isValidMondayISO(undefined)).toBe(false);
    expect(isValidMondayISO("")).toBe(false);
  });
});

describe("getWeekEndISO", () => {
  it("월요일 기준 6일 뒤(일요일)를 반환한다", () => {
    expect(getWeekEndISO("2026-08-31")).toBe("2026-09-06");
  });
});

describe("formatShortDate", () => {
  it("M.D 형태로 표시한다", () => {
    expect(formatShortDate("2026-09-01")).toBe("9.1");
  });
});

describe("formatMonthDayWeekday", () => {
  it("M월 D일 (요일) 형태로 표시한다 (2026-09-04는 금요일)", () => {
    expect(formatMonthDayWeekday("2026-09-04")).toBe("9월 4일 (금)");
  });

  it("월요일도 정확히 표시한다 (2026-08-31)", () => {
    expect(formatMonthDayWeekday("2026-08-31")).toBe("8월 31일 (월)");
  });
});
