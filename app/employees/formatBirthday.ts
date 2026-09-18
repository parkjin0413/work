import type { BirthdayCalendar } from "@/lib/employees/employeesStore";

export function formatBirthday(
  month: number | null,
  day: number | null,
  calendar: BirthdayCalendar | null
): string | null {
  if (!month || !day) return null;
  return `${month}월 ${day}일${calendar === "lunar" ? " (음력)" : ""}`;
}
