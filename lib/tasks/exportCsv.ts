import { getWeekdayIndex, WEEKDAY_LABELS } from "./week";
import type { WorkItem } from "./workItems";

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * 업무 기록 전체를 엑셀에서 바로 열리는 CSV 로 만든다.
 * 앞에 BOM 을 붙여야 엑셀이 한글을 깨뜨리지 않는다.
 */
export function toWorkItemsCsv(items: WorkItem[]): string {
  const header = ["날짜", "요일", "상태", "프로젝트", "내용"];
  const rows = items.map((item) => [
    item.date,
    WEEKDAY_LABELS[getWeekdayIndex(item.date)],
    item.status === "done" ? "완료" : "계획",
    item.projectName ?? "",
    item.body,
  ]);
  return "\uFEFF" + [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
