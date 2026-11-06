"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cake, ChevronLeft, ChevronRight, Globe, Palmtree, Pencil, Trash2 } from "lucide-react";
import { addMonths, daysInMonth, enumerateDates, firstWeekday, monthRange, weekdayOf } from "@/lib/schedule/calendar";
import {
  CATEGORY_COLORS,
  OVERLAY_COLORS,
  SCHEDULE_CATEGORIES,
  type ScheduleCategory,
} from "@/lib/schedule/categories";
import type { Schedule, TeamMember } from "@/lib/schedule/scheduleStore";
import type { OverlayItem } from "@/lib/schedule/overlays";
import { LEAVE_TYPE_LABELS, type LeaveSummary } from "@/lib/leave/annualLeave";
import { ScheduleForm } from "./ScheduleForm";
import { createScheduleAction, deleteScheduleAction, updateScheduleAction } from "./actions";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MAX_CHIPS_PER_CELL = 3;

type FilterKey = ScheduleCategory | OverlayItem["kind"];

type DayItem = { type: "schedule"; schedule: Schedule } | { type: "overlay"; overlay: OverlayItem };

function dayItemKey(item: DayItem): string {
  return item.type === "schedule" ? item.schedule.id : item.overlay.id;
}

/** 홍보부는 담당자("김환진 대리"), 반차는 "오전 반차"/"오후 반차"를 제목 앞에 붙여 보여준다. */
function scheduleTitle(schedule: Schedule): string {
  if (schedule.employeeLabel) return `${schedule.employeeLabel} · ${schedule.title}`;
  const type = schedule.leaveType;
  if (!type || type === "full") return schedule.title;
  const label = LEAVE_TYPE_LABELS[type];
  return schedule.title.includes(label) ? schedule.title : `${label} · ${schedule.title}`;
}

function itemTitle(item: DayItem): string {
  return item.type === "schedule" ? scheduleTitle(item.schedule) : item.overlay.title;
}

function itemColors(item: DayItem) {
  return item.type === "schedule" ? CATEGORY_COLORS[item.schedule.category] : OVERLAY_COLORS[item.overlay.kind];
}

function formatPeriod(start: string, end: string): string {
  const fmt = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
  return start === end ? fmt(start) : `${fmt(start)} ~ ${fmt(end)}`;
}

function OverlayIcon({ kind, size }: { kind: OverlayItem["kind"]; size: number }) {
  const Icon = kind === "hosting" ? Globe : kind === "leave" ? Palmtree : Cake;
  return <Icon size={size} className="shrink-0" aria-hidden="true" />;
}

export function CalendarBoard({
  ym,
  today,
  initialDate,
  schedules,
  overlays,
  holidays,
  leaveSummary,
  teamMembers,
}: {
  ym: string;
  today: string;
  initialDate: string;
  schedules: Schedule[];
  overlays: OverlayItem[];
  holidays: Record<string, string[]>;
  leaveSummary: LeaveSummary | null;
  teamMembers: TeamMember[];
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [hidden, setHidden] = useState<Set<FilterKey>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [year, month] = ym.split("-").map(Number);
  const { first, last } = monthRange(ym);

  const counts = useMemo(() => {
    const map = new Map<FilterKey, number>();
    for (const s of schedules) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    for (const o of overlays) map.set(o.kind, (map.get(o.kind) ?? 0) + 1);
    return map;
  }, [schedules, overlays]);

  const itemsByDate = useMemo(() => {
    const map: Record<string, DayItem[]> = {};
    for (const schedule of schedules) {
      if (hidden.has(schedule.category)) continue;
      const start = schedule.startDate < first ? first : schedule.startDate;
      const end = schedule.endDate > last ? last : schedule.endDate;
      for (const date of enumerateDates(start, end)) (map[date] ??= []).push({ type: "schedule", schedule });
    }
    for (const overlay of overlays) {
      if (hidden.has(overlay.kind)) continue;
      (map[overlay.date] ??= []).push({ type: "overlay", overlay });
    }
    return map;
  }, [schedules, overlays, hidden, first, last]);

  function toggleFilter(key: FilterKey) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectDate(date: string) {
    setSelectedDate(date);
    setIsCreating(false);
    setEditingId(null);
    setErrorMessage(null);
    // 새로고침해도 선택한 날짜가 유지되도록 주소만 바꾼다 (서버 재조회 없음).
    window.history.replaceState(null, "", `/calendar?ym=${ym}&date=${date}`);
    // 좁은 화면에서는 일정 패널이 달력 아래에 있으므로 그쪽으로 스크롤한다.
    if (window.matchMedia("(max-width: 1279px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function goToMonth(targetYm: string, date?: string) {
    router.push(`/calendar?ym=${targetYm}${date ? `&date=${date}` : ""}`);
  }

  async function handleDelete(schedule: Schedule) {
    if (!window.confirm(`"${schedule.title}" 일정을 삭제할까요?`)) return;
    setErrorMessage(null);
    try {
      await deleteScheduleAction(schedule.id);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
    }
  }

  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday(year, month) }, () => null),
    ...Array.from({ length: daysInMonth(year, month) }, (_, i) => `${ym}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedItems = itemsByDate[selectedDate] ?? [];
  const selectedHolidays = holidays[selectedDate] ?? [];
  const currentYear = Number(today.slice(0, 4));

  const filterOptions: { key: FilterKey; label: string; colors: { chip: string; dot: string } }[] = [
    ...SCHEDULE_CATEGORIES.map((c) => ({ key: c as FilterKey, label: c, colors: CATEGORY_COLORS[c] })),
    { key: "leave", label: "연차 발생", colors: OVERLAY_COLORS.leave },
    { key: "birthday", label: "직원 생일", colors: OVERLAY_COLORS.birthday },
    { key: "hosting", label: "호스팅·도메인", colors: OVERLAY_COLORS.hosting },
  ];

  const agenda = (
    <AgendaList
      ym={ym}
      today={today}
      selectedDate={selectedDate}
      itemsByDate={itemsByDate}
      holidays={holidays}
      onSelect={selectDate}
    />
  );

  return (
    // 넓은 화면(xl, 1280px~): [선택한 날짜 + 이달 일정 목록 | 달력] 2단.
    // 좁은 화면: 월 이동·필터 → 달력 → 선택한 날짜 (이달 일정 목록은 휴대폰에서 숨김).
    <div className="mt-5 grid items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      {/* 월 이동 + 분류 필터 */}
      <div className="flex min-w-0 flex-col gap-3 xl:col-span-2 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?ym=${addMonths(ym, -1)}`}
              aria-label="이전 달"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronLeft size={20} />
            </Link>
            <h2 className="min-w-[120px] text-center text-xl font-bold text-foreground">
              {year}년 {month}월
            </h2>
            <Link
              href={`/calendar?ym=${addMonths(ym, 1)}`}
              aria-label="다음 달"
              className="rounded-lg p-1.5 text-muted hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronRight size={20} />
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <select
              value={year}
              onChange={(e) => goToMonth(`${e.target.value}-${String(month).padStart(2, "0")}`)}
              aria-label="연도 선택"
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
            >
              {Array.from({ length: 6 }, (_, i) => currentYear - 2 + i).map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => goToMonth(`${year}-${String(e.target.value).padStart(2, "0")}`)}
              aria-label="월 선택"
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}월
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => (today.startsWith(ym) ? selectDate(today) : goToMonth(today.slice(0, 7), today))}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-surface-hover"
            >
              오늘
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-sm text-muted">
            이번 달 일정 <strong className="text-foreground">{schedules.length}</strong>건
          </span>
          {filterOptions.map(({ key, label, colors }) => {
            const off = hidden.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleFilter(key)}
                aria-pressed={!off}
                title={off ? `${label} 보이기` : `${label} 숨기기`}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium transition-opacity ${
                  off ? "border-border bg-surface text-muted line-through opacity-50" : colors.chip
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${colors.dot}`} />
                {label}
                <span className="text-xs opacity-70">{counts.get(key) ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 왼쪽: 선택한 날짜 + 이달 일정 목록 */}
      <div className="order-3 flex min-w-0 flex-col gap-4 xl:order-none xl:col-start-1 xl:row-start-2">
      <section
        ref={panelRef}
        aria-label="선택한 날짜 일정"
        className="flex scroll-mt-4 flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-lg font-semibold text-foreground">
              <span className="whitespace-nowrap">
                {Number(selectedDate.slice(5, 7))}월 {Number(selectedDate.slice(8, 10))}일 (
                {WEEKDAYS[weekdayOf(selectedDate)]})
              </span>
              {selectedDate === today ? (
                <span className="whitespace-nowrap rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                  오늘
                </span>
              ) : null}
            </h2>
            {selectedHolidays.length > 0 ? (
              <p className="text-sm text-red-500">{selectedHolidays.join(" · ")}</p>
            ) : null}
          </div>
          {!isCreating ? (
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setEditingId(null);
              }}
              className="shrink-0 whitespace-nowrap rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              + 일정 추가
            </button>
          ) : null}
        </div>

        {isCreating ? (
          <ScheduleForm
              teamMembers={teamMembers}
            key={`create-${selectedDate}`}
            initial={{ title: "", category: "미팅", startDate: selectedDate, endDate: selectedDate, memo: "" }}
            submitLabel="등록"
            onSubmit={async (input) => {
              await createScheduleAction(input);
              setIsCreating(false);
              router.refresh();
            }}
            onCancel={() => setIsCreating(false)}
          />
        ) : null}

        {errorMessage ? (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}

        {selectedItems.length === 0 && !isCreating ? (
          <p className="py-3 text-center text-sm text-muted">등록된 일정이 없습니다.</p>
        ) : null}

        {selectedItems.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {selectedItems.map((item) => {
              if (item.type === "overlay") {
                const { overlay } = item;
                return (
                  <li
                    key={overlay.id}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${OVERLAY_COLORS[overlay.kind].chip}`}
                  >
                    <OverlayIcon kind={overlay.kind} size={15} />
                    <span className="min-w-0 flex-1 truncate font-medium">{overlay.title}</span>
                    {overlay.kind === "hosting" ? (
                      <Link href="/hosting" className="shrink-0 text-xs underline">
                        호스팅 보기
                      </Link>
                    ) : (
                      <span className="shrink-0 text-xs opacity-80">{overlay.detail}</span>
                    )}
                  </li>
                );
              }

              const { schedule } = item;
              if (editingId === schedule.id) {
                return (
                  <li key={schedule.id}>
                    <ScheduleForm
              teamMembers={teamMembers}
                      initial={schedule}
                      submitLabel="저장"
                      onSubmit={async (input) => {
                        await updateScheduleAction(schedule.id, input);
                        setEditingId(null);
                        router.refresh();
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  </li>
                );
              }

              return (
                <li
                  key={schedule.id}
                  className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 ${CATEGORY_COLORS[schedule.category].chip}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold opacity-80">
                        <span>{schedule.category}</span>
                        {schedule.startDate !== schedule.endDate ? (
                          <span className="font-normal">· {formatPeriod(schedule.startDate, schedule.endDate)}</span>
                        ) : null}
                      </div>
                      <p className="break-words text-[15px] font-semibold">{scheduleTitle(schedule)}</p>
                    </div>
                    <div className="-mr-1 flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(schedule.id);
                          setIsCreating(false);
                        }}
                        aria-label={`${schedule.title} 수정`}
                        className="rounded-md p-1.5 opacity-60 hover:bg-white/60 hover:opacity-100 dark:hover:bg-white/10"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(schedule)}
                        aria-label={`${schedule.title} 삭제`}
                        className="rounded-md p-1.5 text-danger opacity-70 hover:bg-white/60 hover:opacity-100 dark:hover:bg-white/10"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  {schedule.memo ? (
                    <p className="whitespace-pre-line break-words text-sm opacity-80">{schedule.memo}</p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

        {leaveSummary ? <LeaveCard summary={leaveSummary} /> : null}
        <div className="hidden md:block">{agenda}</div>
      </div>


      {/* 월 달력 */}
      <section
        aria-label={`${year}년 ${month}월 달력`}
        className="order-2 min-w-0 rounded-2xl border border-border bg-surface p-2 sm:p-4 xl:order-none xl:col-start-2 xl:row-start-2"
      >
        <div className="grid grid-cols-7 text-center text-sm font-semibold text-muted">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`pb-2 ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : ""}`}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {cells.map((date, i) => {
            if (!date) return <div key={`empty-${i}`} className="min-h-[64px] sm:min-h-[104px] lg:min-h-[124px]" />;

            const day = Number(date.slice(8, 10));
            const weekday = weekdayOf(date);
            const holidayNames = holidays[date] ?? [];
            const items = itemsByDate[date] ?? [];
            const isToday = date === today;
            const isSelected = date === selectedDate;
            const dayColor =
              holidayNames.length > 0 || weekday === 0 ? "text-red-500" : weekday === 6 ? "text-blue-500" : "text-foreground";

            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                aria-label={`${month}월 ${day}일${holidayNames.length ? ` ${holidayNames.join(", ")}` : ""}, 일정 ${items.length}건`}
                aria-pressed={isSelected}
                className={`flex min-h-[64px] min-w-0 flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition-colors sm:min-h-[104px] sm:p-1.5 lg:min-h-[124px] ${
                  isSelected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:bg-surface-hover"
                }`}
              >
                <div className="flex min-w-0 items-center gap-1">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold sm:text-base ${
                      isToday ? "bg-accent text-accent-foreground" : dayColor
                    }`}
                  >
                    {day}
                  </span>
                  {holidayNames.length > 0 ? (
                    <span className="hidden truncate text-xs text-red-500 sm:inline lg:text-[13px]">
                      {holidayNames.join(" · ")}
                    </span>
                  ) : null}
                </div>

                {/* 휴대폰: 색 점 */}
                {items.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-1 sm:hidden">
                    {items.slice(0, 4).map((item) => (
                      <span key={dayItemKey(item)} className={`h-2 w-2 rounded-full ${itemColors(item).dot}`} />
                    ))}
                  </div>
                ) : null}

                {/* 태블릿·PC: 제목 */}
                <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                  {items.slice(0, MAX_CHIPS_PER_CELL).map((item) => (
                    <span
                      key={dayItemKey(item)}
                      title={itemTitle(item)}
                      className={`flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium lg:text-[13px] ${itemColors(item).chip}`}
                    >
                      {item.type === "overlay" ? <OverlayIcon kind={item.overlay.kind} size={12} /> : null}
                      <span className="truncate">{itemTitle(item)}</span>
                    </span>
                  ))}
                  {items.length > MAX_CHIPS_PER_CELL ? (
                    <span className="px-1 text-xs text-muted">+{items.length - MAX_CHIPS_PER_CELL}건 더</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** 이달에 일정이 있는 날만 한 줄짜리 박스로 날짜순 정리한다. 누르면 그 날짜를 선택한다. */
function AgendaList({
  ym,
  today,
  selectedDate,
  itemsByDate,
  holidays,
  onSelect,
}: {
  ym: string;
  today: string;
  selectedDate: string;
  itemsByDate: Record<string, DayItem[]>;
  holidays: Record<string, string[]>;
  onSelect: (date: string) => void;
}) {
  const dates = Object.keys(itemsByDate)
    .filter((date) => date.startsWith(ym) && itemsByDate[date].length > 0)
    .sort();
  const month = Number(ym.slice(5, 7));

  return (
    <section aria-label={`${month}월 일정 목록`} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <h2 className="px-1 text-sm font-semibold text-foreground">
        {month}월 일정 목록 <span className="font-normal text-muted">{dates.length}일</span>
      </h2>

      {dates.length === 0 ? (
        <p className="py-2 text-center text-sm text-muted">이번 달 일정이 없습니다.</p>
      ) : (
        <ol className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">
          {dates.map((date) => {
            const weekday = weekdayOf(date);
            const isHoliday = (holidays[date] ?? []).length > 0;
            const isSelected = date === selectedDate;
            const dateColor = isHoliday || weekday === 0 ? "text-red-500" : weekday === 6 ? "text-blue-500" : "text-foreground";

            return (
              <li key={date}>
                <button
                  type="button"
                  onClick={() => onSelect(date)}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start gap-2 rounded-lg border px-2.5 py-1.5 text-left text-sm transition-colors ${
                    isSelected ? "border-accent bg-accent/5" : "border-border hover:bg-surface-hover"
                  } ${date < today && !isSelected ? "opacity-55" : ""}`}
                >
                  <span className={`w-[64px] shrink-0 whitespace-nowrap font-semibold ${dateColor}`}>
                    {Number(date.slice(8, 10))}일 ({WEEKDAYS[weekday]})
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    {itemsByDate[date].map((item) => (
                      <span key={dayItemKey(item)} className="flex min-w-0 items-center gap-1.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${itemColors(item).dot}`} />
                        <span className="truncate text-foreground">{itemTitle(item)}</span>
                      </span>
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function formatDays(days: number): string {
  return Number.isInteger(days) ? `${days}` : days.toFixed(1);
}

function formatKoreanDate(dateISO: string): string {
  return `${Number(dateISO.slice(0, 4))}.${Number(dateISO.slice(5, 7))}.${Number(dateISO.slice(8, 10))}`;
}

/** 근로기준법 기준으로 계산한 내 연차 현황. 연차 분류 일정이 사용일로 반영된다. */
function LeaveCard({ summary }: { summary: LeaveSummary }) {
  // 가장 먼저 소멸하는 묶음 중 남은 게 있으면 마감일을 알려준다.
  const expiring = summary.active
    .filter((g) => g.remaining > 0)
    .sort((a, b) => a.expires.localeCompare(b.expires))[0];
  const expiringDays = expiring
    ? summary.active.filter((g) => g.expires === expiring.expires).reduce((sum, g) => sum + g.remaining, 0)
    : 0;

  return (
    <section aria-label="내 연차" className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold text-foreground">내 연차</h2>
        <span className="text-xs text-muted">입사 {formatKoreanDate(summary.hireDate)}</span>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-xl bg-bg px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-xs text-muted">사용 가능 연차</p>
          <p className="text-2xl font-bold leading-tight text-foreground">
            {formatDays(summary.available)}
            <span className="ml-0.5 text-sm font-medium text-muted">일</span>
          </p>
        </div>
        <dl className="grid shrink-0 grid-cols-[auto_3.5rem] gap-x-3 gap-y-0.5 text-xs">
          <dt className="text-muted">사용</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">{formatDays(summary.usedTotal)}일</dd>
          <dt className="text-muted">예정</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">{formatDays(summary.plannedTotal)}일</dd>
          <dt className="text-muted">예정 후 잔여</dt>
          <dd className="text-right font-medium tabular-nums text-foreground">
            {formatDays(summary.availableAfterPlanned)}일
          </dd>
        </dl>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-1 text-xs">
        {summary.nextGrant ? (
          <>
            <dt className="text-muted">다음 발생</dt>
            <dd className="text-right text-foreground">
              <span className="font-medium">{formatKoreanDate(summary.nextGrant.date)}</span>
              <span className="ml-1.5 text-accent">+{summary.nextGrant.days}일</span>
            </dd>
          </>
        ) : null}
        {expiring ? (
          <>
            <dt className="text-muted">사용기한</dt>
            <dd className="text-right text-foreground">
              <span className="font-medium">{formatKoreanDate(expiring.expires)}</span>까지
              <span className="ml-1.5 font-medium">{formatDays(expiringDays)}일</span>
            </dd>
          </>
        ) : null}
      </dl>
      {summary.overdrawn > 0 ? (
        <p className="px-1 text-xs text-danger">발생한 연차보다 {formatDays(summary.overdrawn)}일 더 잡혀 있습니다.</p>
      ) : null}
    </section>
  );
}
