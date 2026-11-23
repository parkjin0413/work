import { describe, expect, it } from "vitest";
import { monthsBetween, shiftMonthsISO } from "./statement";

describe("shiftMonthsISO", () => {
  it("달을 옮긴다", () => {
    expect(shiftMonthsISO("2026-10-15", 1)).toBe("2026-11-15");
    expect(shiftMonthsISO("2026-12-03", 1)).toBe("2027-01-03");
    expect(shiftMonthsISO("2026-01-10", -1)).toBe("2025-12-10");
  });

  it("없는 날은 그 달 마지막 날로", () => {
    expect(shiftMonthsISO("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonthsISO("2026-10-31", 1)).toBe("2026-11-30");
  });
});

describe("monthsBetween", () => {
  it("달 차이를 센다", () => {
    expect(monthsBetween("2026-10-05", "2026-12-01")).toBe(2);
    expect(monthsBetween("2026-12-20", "2027-01-02")).toBe(1);
    expect(monthsBetween("2026-11-01", "2026-11-30")).toBe(0);
  });
});
