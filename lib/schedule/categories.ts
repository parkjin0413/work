// 연간일정 분류. DB check 제약(0014_schedules_categories.sql)과 같은 목록을 유지해야 한다.
export const SCHEDULE_CATEGORIES = ["연차", "본사", "시장조사", "미팅", "촬영", "전시회", "행사"] as const;

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

export function isScheduleCategory(value: string): value is ScheduleCategory {
  return (SCHEDULE_CATEGORIES as readonly string[]).includes(value);
}

/** chip: 배경·글자·테두리(파스텔 톤), dot: 범례·모바일 점 색. */
type ChipColors = { chip: string; dot: string };

export const CATEGORY_COLORS: Record<ScheduleCategory, ChipColors> = {
  시장조사: {
    chip: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/25 dark:bg-sky-400/10 dark:text-sky-200",
    dot: "bg-sky-300 dark:bg-sky-400",
  },
  미팅: {
    chip: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/25 dark:bg-violet-400/10 dark:text-violet-200",
    dot: "bg-violet-300 dark:bg-violet-400",
  },
  촬영: {
    chip: "border-pink-200 bg-pink-50 text-pink-800 dark:border-pink-400/25 dark:bg-pink-400/10 dark:text-pink-200",
    dot: "bg-pink-300 dark:bg-pink-400",
  },
  전시회: {
    chip: "border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-400/25 dark:bg-lime-400/10 dark:text-lime-200",
    dot: "bg-lime-300 dark:bg-lime-400",
  },
  행사: {
    chip: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-orange-200",
    dot: "bg-orange-300 dark:bg-orange-400",
  },
  연차: {
    chip: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-400/25 dark:bg-slate-400/10 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  본사: {
    chip: "border-teal-200 bg-teal-50 text-teal-800 dark:border-teal-400/25 dark:bg-teal-400/10 dark:text-teal-200",
    dot: "bg-teal-300 dark:bg-teal-400",
  },
};

/** 다른 메뉴에서 자동으로 가져온 항목(호스팅 만료, 직원 생일). 점선 테두리로 직접 입력한 일정과 구분한다. */
export const OVERLAY_COLORS = {
  hosting: {
    chip: "border-dashed border-amber-300 bg-amber-50/60 text-amber-800 dark:border-amber-400/40 dark:bg-amber-400/5 dark:text-amber-200",
    dot: "bg-amber-300 dark:bg-amber-400",
  },
  leave: {
    chip: "border-dashed border-slate-300 bg-slate-50/60 text-slate-700 dark:border-slate-400/40 dark:bg-slate-400/5 dark:text-slate-200",
    dot: "bg-slate-400",
  },
  birthday: {
    chip: "border-dashed border-rose-300 bg-rose-50/60 text-rose-800 dark:border-rose-400/40 dark:bg-rose-400/5 dark:text-rose-200",
    dot: "bg-rose-300 dark:bg-rose-400",
  },
} as const;
