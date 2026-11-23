import { describe, expect, it } from "vitest";
import { inPeriod, matchesQuery, monthlyTotals, parseFormsFilter } from "./listFilter";

describe("parseFormsFilter", () => {
  it("잘못된 값은 버린다", () => {
    expect(parseFormsFilter({ q: "  식대 ", year: "2026", month: "11" })).toEqual({ q: "식대", year: 2026, month: 11 });
    expect(parseFormsFilter({ year: "26", month: "11" })).toEqual({ q: "", year: null, month: null });
    expect(parseFormsFilter({ year: "2026", month: "13" })).toEqual({ q: "", year: 2026, month: null });
  });
});

describe("inPeriod", () => {
  const f = parseFormsFilter({ year: "2026", month: "11" });
  it("연·월이 맞을 때만", () => {
    expect(inPeriod("2026-11-03", f)).toBe(true);
    expect(inPeriod("2026-10-31", f)).toBe(false);
    expect(inPeriod(null, f)).toBe(false);
    expect(inPeriod(null, parseFormsFilter({}))).toBe(true);
  });
});

describe("matchesQuery", () => {
  it("띄어쓰기·대소문자 무시", () => {
    const f = parseFormsFilter({ q: "샘플 북" });
    expect(matchesQuery(f, "샘플북 제작 품의")).toBe(true);
    expect(matchesQuery(f, "카탈로그", null)).toBe(false);
  });
});

describe("monthlyTotals", () => {
  it("달별로 묶고 최근 순", () => {
    const rows = monthlyTotals(
      [
        { draftedAt: "2026-11-02", totalAmount: 1000 },
        { draftedAt: "2026-11-20", totalAmount: 500 },
        { draftedAt: "2026-09-01", totalAmount: 300 },
      ],
      [{ firstDate: "2026-10-01", writtenAt: "2026-11-03", totalAmount: 70000 }],
      { year: null },
    );
    expect(rows.map((r) => r.ym)).toEqual(["2026-11", "2026-10", "2026-09"]);
    expect(rows[0]).toMatchObject({ expense: 1500, expenseCount: 2, statement: 0 });
    expect(rows[1]).toMatchObject({ statement: 70000, statementCount: 1 });
  });
});
