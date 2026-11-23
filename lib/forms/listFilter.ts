/** 양식 목록 검색·기간 필터와 월별 합계 (순수 함수, 서버에서 쓴다) */

export type FormsFilter = { q: string; year: number | null; month: number | null };

export function parseFormsFilter(params: { q?: string; year?: string; month?: string }): FormsFilter {
  const q = (params.q ?? "").trim().slice(0, 50);
  const year = /^\d{4}$/.test(params.year ?? "") ? Number(params.year) : null;
  const monthNum = Number(params.month);
  const month = year && Number.isInteger(monthNum) && monthNum >= 1 && monthNum <= 12 ? monthNum : null;
  return { q, year, month };
}

export function isFiltered(filter: FormsFilter): boolean {
  return filter.q !== "" || filter.year !== null;
}

/** 날짜("YYYY-MM-DD")가 고른 연도·월에 드는지. 연도를 안 골랐으면 늘 true */
export function inPeriod(dateISO: string | null | undefined, filter: FormsFilter): boolean {
  if (filter.year === null) return true;
  if (!dateISO) return false;
  if (Number(dateISO.slice(0, 4)) !== filter.year) return false;
  return filter.month === null || Number(dateISO.slice(5, 7)) === filter.month;
}

/** 검색어가 글자들 가운데 하나에 들어 있는지 (대소문자·띄어쓰기 무시). 검색어가 없으면 true */
export function matchesQuery(filter: FormsFilter, ...texts: (string | null | undefined)[]): boolean {
  if (!filter.q) return true;
  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const needle = normalize(filter.q);
  return texts.some((t) => t != null && normalize(t).includes(needle));
}

export type MonthlyTotal = { ym: string; expense: number; expenseCount: number; statement: number; statementCount: number };

/**
 * 월별 합계. 품의서는 기안일, 경비내역서는 내역 기간 첫날(없으면 작성일)의 달로 묶는다.
 * 연도를 고르면 그해 1~12월 가운데 문서가 있는 달, 아니면 문서가 있는 최근 `recent` 개월.
 */
export function monthlyTotals(
  expenses: { draftedAt: string; totalAmount: number }[],
  statements: { firstDate: string | null; writtenAt: string; totalAmount: number }[],
  options: { year: number | null; recent?: number },
): MonthlyTotal[] {
  const map = new Map<string, MonthlyTotal>();
  const entry = (ym: string) => {
    let row = map.get(ym);
    if (!row) {
      row = { ym, expense: 0, expenseCount: 0, statement: 0, statementCount: 0 };
      map.set(ym, row);
    }
    return row;
  };
  for (const e of expenses) {
    const row = entry(e.draftedAt.slice(0, 7));
    row.expense += e.totalAmount;
    row.expenseCount += 1;
  }
  for (const s of statements) {
    const row = entry((s.firstDate ?? s.writtenAt).slice(0, 7));
    row.statement += s.totalAmount;
    row.statementCount += 1;
  }
  const rows = Array.from(map.values()).sort((a, b) => b.ym.localeCompare(a.ym));
  if (options.year !== null) return rows.filter((r) => Number(r.ym.slice(0, 4)) === options.year);
  return rows.slice(0, options.recent ?? 6);
}
