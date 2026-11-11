export const dynamic = "force-dynamic";

import { FolderKanban } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { withRetry } from "@/lib/supabase/withRetry";
import { getYearHolidays } from "@/lib/schedule/holidays";
import { listSchedulesInRange, type Schedule } from "@/lib/schedule/scheduleStore";
import { listProjects } from "@/lib/tasks/projects";
import { addDaysISO, getKstTodayISO, getMondayOfISO, isValidMondayISO } from "@/lib/tasks/week";
import { listOverduePlanned, listWorkItemsInRange } from "@/lib/tasks/workItems";
import { ProjectBoard } from "./ProjectBoard";
import { SectionHeader } from "./SectionHeader";
import { WeekPlanner } from "./WeekPlanner";
import { WorkSearch } from "./WorkSearch";

const MAIN_CLASS = "min-w-0 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] py-6";

/** 두 주(이번 주 + 다음 주)에 걸친 공휴일. 연말에는 두 해를 합친다. */
function holidaysBetween(first: string, last: string): Record<string, string[]> {
  const years = Array.from(new Set([Number(first.slice(0, 4)), Number(last.slice(0, 4))]));
  const merged: Record<string, string[]> = {};
  for (const year of years) {
    for (const [date, names] of Object.entries(getYearHolidays(year))) {
      if (date >= first && date <= last) merged[date] = names;
    }
  }
  return merged;
}

export default async function TasksPage({ searchParams }: { searchParams: { week?: string } }) {
  const todayISO = getKstTodayISO();
  const currentWeekStart = getMondayOfISO(todayISO);
  const weekStart = isValidMondayISO(searchParams.week) ? searchParams.week : currentWeekStart;
  const rangeEnd = addDaysISO(weekStart, 13);
  const isCurrentWeek = weekStart === currentWeekStart;

  // 하나가 실패해도 나머지는 보여준다. 콜드 스타트 직후 첫 요청이 드물게 실패하는 경우가
  // 있어 각각 한 번씩 재시도한다.
  const [itemsResult, overdueResult, schedulesResult, projectListResult] = await Promise.allSettled([
    withRetry(() => listWorkItemsInRange(weekStart, rangeEnd), "tasks/items"),
    isCurrentWeek ? withRetry(() => listOverduePlanned(currentWeekStart), "tasks/overdue") : Promise.resolve([]),
    withRetry(() => listSchedulesInRange(weekStart, rangeEnd), "tasks/schedules"),
    withRetry(() => listProjects(), "tasks/project-list"),
  ]);

  for (const [label, result] of [
    ["주간 항목", itemsResult],
    ["밀린 계획", overdueResult],
    ["연간일정", schedulesResult],
    ["프로젝트", projectListResult],
  ] as const) {
    if (result.status === "rejected") console.error(`[tasks] ${label} 조회 실패:`, result.reason);
  }

  // 주간 업무에서 고를 수 있는 프로젝트 = 완료하지 않은 프로젝트·상시 업무 (최근에 손댄 순)
  const projectOptions =
    projectListResult.status === "fulfilled"
      ? projectListResult.value.filter((p) => !p.isCompleted).map((p) => ({ id: p.id, name: p.name }))
      : [];
  const schedules: Schedule[] = schedulesResult.status === "fulfilled" ? schedulesResult.value : [];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Sidebar />
      <main className={MAIN_CLASS}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-foreground">업무</h1>
          <WorkSearch todayISO={todayISO} />
        </div>

        <div className="mt-6 space-y-10">
          {itemsResult.status === "fulfilled" ? (
            <WeekPlanner
              weekStart={weekStart}
              currentWeekStart={currentWeekStart}
              todayISO={todayISO}
              items={itemsResult.value}
              overdue={overdueResult.status === "fulfilled" ? overdueResult.value : []}
              schedules={schedules}
              holidays={holidaysBetween(weekStart, rangeEnd)}
              projects={projectOptions}
              undatedCount={
                projectListResult.status === "fulfilled"
                  ? projectListResult.value.filter((p) => !p.isCompleted).reduce((sum, p) => sum + p.steps.length, 0)
                  : 0
              }
            />
          ) : (
            <ErrorBox message="주간 업무를 불러오지 못했습니다. Supabase에서 0020_work_items 마이그레이션을 실행했는지 확인해주세요." />
          )}

          {projectListResult.status === "fulfilled" ? (
            <ProjectBoard projects={projectListResult.value} todayISO={todayISO} />
          ) : (
            <section>
              <SectionHeader icon={FolderKanban} title="프로젝트" />
              <ErrorBox message="프로젝트 목록을 불러오지 못했습니다. Supabase에서 0021_project_steps 마이그레이션을 실행했는지 확인해주세요." />
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
