import { describe, expect, it } from "vitest";
import { buildLeavePlan } from "./annualLeave";

describe("buildLeavePlan", () => {
  it("입사 첫해 월 만근 묶음과 해마다 생기는 연차", () => {
    const rows = buildLeavePlan("2026-09-01", "2026-11-23");
    expect(rows.map((r) => [r.from, r.to, r.days, r.expires, r.state])).toEqual([
      ["2026-10-01", "2027-08-01", 11, "2027-08-31", "current"],
      ["2027-09-01", null, 15, "2028-08-31", "upcoming"],
      ["2028-09-01", null, 15, "2029-08-31", "upcoming"],
      ["2029-09-01", null, 16, "2030-08-31", "upcoming"],
    ]);
  });

  it("지난 묶음은 뺀다", () => {
    const rows = buildLeavePlan("2026-09-01", "2027-10-01", 2);
    expect(rows.map((r) => [r.from, r.state])).toEqual([
      ["2027-09-01", "current"],
      ["2028-09-01", "upcoming"],
    ]);
  });
});
