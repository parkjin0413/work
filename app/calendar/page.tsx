export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { withRetry } from "@/lib/supabase/withRetry";
import { getKstTodayISO } from "@/lib/tasks/week";
import { isValidISODate, isValidYm, monthRange } from "@/lib/schedule/calendar";
import { getMonthHolidays } from "@/lib/schedule/holidays";
import { listLeaveSchedules, listSchedulesInRange } from "@/lib/schedule/scheduleStore";
import { HIRE_DATE } from "@/lib/leave/config";
import { leaveEventsInRange, summarizeLeave, type LeaveSummary } from "@/lib/leave/annualLeave";
import { listBirthdayOverlays, listHostingOverlays, type OverlayItem } from "@/lib/schedule/overlays";
import { CalendarBoard } from "./CalendarBoard";

/** 부가 정보(호스팅 만료·생일)는 실패해도 달력 자체는 보여준다. */
async function loadOverlay(label: string, load: () => Promise<OverlayItem[]>): Promise<OverlayItem[]> {
  try {
    return await withRetry(load, label);
  } catch (error) {
    console.error(`[calendar] ${label} 조회 실패:`, error);
    return [];
  }
}

/** 내 연차 현황. 실패하면 연차 카드만 빼고 달력은 보여준다. */
async function loadLeaveSummary(today: string): Promise<LeaveSummary | null> {
  try {
    const leaves = await withRetry(() => listLeaveSchedules(), "calendar/leave");
    return summarizeLeave(HIRE_DATE, leaves, today);
  } catch (error) {
    console.error("[calendar] 연차 계산 실패:", error);
    return null;
  }
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: { ym?: string; date?: string };
}) {
  const today = getKstTodayISO();
  const ym = isValidYm(searchParams.ym) ? searchParams.ym : today.slice(0, 7);
  const selectedDate =
    isValidISODate(searchParams.date) && searchParams.date.startsWith(ym)
      ? searchParams.date
      : today.startsWith(ym)
        ? today
        : `${ym}-01`;
  const { first, last } = monthRange(ym);

  let schedules;
  try {
    schedules = await withRetry(() => listSchedulesInRange(first, last), "calendar");
  } catch (error) {
    console.error("[calendar] listSchedulesInRange 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <h1 className="text-lg font-semibold text-foreground">연간일정</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              일정을 불러오지 못했습니다. Supabase 연결 상태와 0013_schedules.sql 마이그레이션 실행 여부를
              확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const [hostingOverlays, birthdayOverlays, leaveSummary] = await Promise.all([
    loadOverlay("calendar/hosting", () => listHostingOverlays(first, last)),
    loadOverlay("calendar/birthdays", () => listBirthdayOverlays(first, last)),
    loadLeaveSummary(today),
  ]);
  const leaveOverlays: OverlayItem[] = leaveSummary
    ? leaveEventsInRange(leaveSummary, first, last).map((event) => ({ ...event, kind: "leave" as const }))
    : [];

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-foreground">연간일정</h1>
        <p className="mt-1 text-sm text-muted">
          날짜를 누르면 그날 일정을 보고 추가할 수 있습니다. 호스팅·도메인 계약일과 직원 생일은 자동으로
          표시됩니다.
        </p>

        <CalendarBoard
          key={ym}
          ym={ym}
          today={today}
          initialDate={selectedDate}
          schedules={schedules}
          overlays={[...leaveOverlays, ...hostingOverlays, ...birthdayOverlays]}
          leaveSummary={leaveSummary}
          holidays={getMonthHolidays(ym)}
        />
      </main>
    </div>
  );
}
