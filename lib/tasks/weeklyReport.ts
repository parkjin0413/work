import { addDaysISO, getWeekdayIndex, WEEKDAY_LABELS } from "./week";
import type { WorkItem } from "./workItems";

/**
 * 회사 주간업무보고(엑셀) 양식:
 *   日 | 요일 | 이번 주 한 일 | 日 | 요일 | 다음 주 할 일
 * 한 줄이 하루(월~일 7줄)이고, 칸 안에는 "1. … 2. …" 번호 목록이 들어간다.
 */
export type ReportDay = {
  date: string;
  day: number;
  weekday: string;
  lines: string[];
};

export type WeeklyReport = {
  thisWeekTitle: string;
  nextWeekTitle: string;
  thisWeek: ReportDay[];
  nextWeek: ReportDay[];
  /** 이번 주에 계획만 하고 완료하지 못한 항목 (보고서에서는 빠진다) */
  unfinished: WorkItem[];
};

/** "11월 02일 - 11월 08일" (양식과 같은 두 자리 일) */
export function formatReportRange(weekStart: string): string {
  const end = addDaysISO(weekStart, 6);
  const fmt = (iso: string) => {
    const [, m, d] = iso.split("-");
    return `${Number(m)}월 ${d}일`;
  };
  return `${fmt(weekStart)} - ${fmt(end)}`;
}

function oneLine(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, " ").replace(/\t/g, " ").trim();
}

function buildDays(weekStart: string, items: WorkItem[], status: WorkItem["status"] | "any"): ReportDay[] {
  const days: ReportDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDaysISO(weekStart, i);
    const bodies = items
      .filter((item) => item.date === date && (status === "any" || item.status === status))
      .map((item) => oneLine(item.body))
      .filter(Boolean);
    days.push({
      date,
      day: Number(date.slice(8, 10)),
      weekday: WEEKDAY_LABELS[getWeekdayIndex(date)],
      lines: bodies.map((body, index) => `${index + 1}. ${body}`),
    });
  }
  return days;
}

/**
 * 이번 주는 "완료한 항목"만, 다음 주는 적어둔 항목 전부(대부분 계획)를 날짜별로 정리한다.
 * items 는 정렬된 상태(compareWorkItems)로 넘긴다.
 */
export function buildWeeklyReport(weekStart: string, items: WorkItem[]): WeeklyReport {
  const nextWeekStart = addDaysISO(weekStart, 7);
  const thisWeekEnd = addDaysISO(weekStart, 6);
  return {
    thisWeekTitle: formatReportRange(weekStart),
    nextWeekTitle: formatReportRange(nextWeekStart),
    thisWeek: buildDays(weekStart, items, "done"),
    nextWeek: buildDays(nextWeekStart, items, "any"),
    unfinished: items.filter(
      (item) => item.status === "planned" && item.date >= weekStart && item.date <= thisWeekEnd
    ),
  };
}

/**
 * 못 한 계획을 다음 주 평일(공휴일 제외)에 하루 perDay 개씩 순서대로 나눈다.
 * 평일 칸보다 많으면 하루 개수를 늘려 금요일 안에 모두 들어가게 한다.
 */
export function spreadAcrossWeek<T>(
  items: T[],
  weekStart: string,
  holidays: Record<string, string[]> = {},
  perDay = 3
): { date: string; items: T[] }[] {
  if (items.length === 0) return [];
  const weekdays = Array.from({ length: 5 }, (_, i) => addDaysISO(weekStart, i));
  const workdays = weekdays.filter((date) => !(holidays[date]?.length));
  const days = workdays.length > 0 ? workdays : weekdays;
  const size = Math.max(perDay, Math.ceil(items.length / days.length));
  const groups: { date: string; items: T[] }[] = [];
  for (let i = 0; i < items.length; i += size) {
    groups.push({ date: days[groups.length], items: items.slice(i, i + size) });
  }
  return groups;
}

/** 엑셀 셀 값: 줄바꿈·탭·따옴표가 있으면 따옴표로 감싼다 (엑셀이 한 칸으로 붙여넣음). */
function excelCell(value: string): string {
  return /["\n\t]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * 엑셀 "日" 머리칸에 붙여넣을 텍스트: 머리줄 1줄 + 월~일 7줄, 6칸씩.
 * 기간 제목까지 한 번에 바뀐다.
 */
export function toExcelText(report: WeeklyReport): string {
  const rows: string[][] = [["日", "요일", report.thisWeekTitle, "日", "요일", report.nextWeekTitle]];
  for (let i = 0; i < 7; i += 1) {
    const a = report.thisWeek[i];
    const b = report.nextWeek[i];
    rows.push([String(a.day), a.weekday, a.lines.join("\n"), String(b.day), b.weekday, b.lines.join("\n")]);
  }
  return rows.map((row) => row.map(excelCell).join("\t")).join("\r\n");
}
