"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  pointerWithin,
  rectIntersection,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CopyButton } from "@/components/CopyButton";
import { CATEGORY_COLORS } from "@/lib/schedule/categories";
import type { Schedule } from "@/lib/schedule/scheduleStore";
import { addDaysISO, formatMonthDayWeekday, getWeekdayIndex, WEEKDAY_LABELS } from "@/lib/tasks/week";
import { splitPastedLines } from "@/lib/tasks/pasteLines";
import { planDrop } from "@/lib/tasks/reorder";
import { buildWeeklyReport, spreadAcrossWeek, toExcelText } from "@/lib/tasks/weeklyReport";
import { compareWorkItems, type ProjectOption, type WorkItem, type WorkItemStatus } from "@/lib/tasks/workItems";
import { SectionHeader } from "./SectionHeader";
import {
  createWorkItemAction,
  createWorkItemsAction,
  deleteWorkItemAction,
  moveWorkItemsAction,
  reorderWorkItemsAction,
  updateWorkItemAction,
} from "./workItemActions";

type Props = {
  weekStart: string;
  currentWeekStart: string;
  todayISO: string;
  /** weekStart ~ 다음 주 일요일(14일)의 항목 */
  items: WorkItem[];
  /** 지난 주들에서 체크하지 못한 계획 (이번 주를 볼 때만) */
  overdue: WorkItem[];
  schedules: Schedule[];
  holidays: Record<string, string[]>;
  projects: ProjectOption[];
  /** 프로젝트의 날짜 안 정한 남은 단계 수 (아래 "날짜 미정" 카드로 가는 표시) */
  undatedCount?: number;
};

type NewItem = {
  date: string;
  body: string;
  status: WorkItemStatus;
  projectId: string | null;
  scheduleId?: string | null;
};

let tempSeq = 0;

export function WeekPlanner({
  weekStart,
  currentWeekStart,
  todayISO,
  items: serverItems,
  overdue: serverOverdue,
  schedules,
  holidays,
  projects,
  undatedCount = 0,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState(serverItems);
  const [overdue, setOverdue] = useState(serverOverdue);
  const [error, setError] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  useEffect(() => setItems(serverItems), [serverItems]);
  useEffect(() => setOverdue(serverOverdue), [serverOverdue]);

  const nextWeekStart = addDaysISO(weekStart, 7);
  const isCurrentWeek = weekStart === currentWeekStart;
  const isFriday = getWeekdayIndex(todayISO) === 4;
  const sortedItems = useMemo(() => [...items].sort(compareWorkItems), [items]);
  // 아직 오지 않은 주(명절 전 미리 제출 등)는 계획까지 "한 일"로 넣는다.
  const isFutureWeek = weekStart > currentWeekStart;
  const report = useMemo(
    () => buildWeeklyReport(weekStart, sortedItems, { inAdvance: isFutureWeek }),
    [weekStart, sortedItems, isFutureWeek],
  );
  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  async function run(task: () => Promise<unknown>, rollback: () => void, message: string) {
    setError(null);
    try {
      await task();
      router.refresh();
    } catch (e) {
      rollback();
      // 일부만 저장됐을 수 있으니 서버 상태로 다시 맞춘다.
      router.refresh();
      setError(e instanceof Error && e.message ? e.message : message);
    }
  }

  async function addItem(input: NewItem) {
    const tempId = `tmp-${++tempSeq}`;
    const temp: WorkItem = {
      id: tempId,
      date: input.date,
      body: input.body.trim(),
      status: input.status,
      projectId: input.projectId,
      projectName: input.projectId ? (projectNameById.get(input.projectId) ?? null) : null,
      scheduleId: input.scheduleId ?? null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      createdAt: new Date().toISOString(),
    };
    setItems((prev) => [...prev, temp]);
    setError(null);
    try {
      const saved = await createWorkItemAction(input);
      setItems((prev) => {
        if (prev.some((i) => i.id === saved.id)) return prev.filter((i) => i.id !== tempId);
        if (prev.some((i) => i.id === tempId)) return prev.map((i) => (i.id === tempId ? saved : i));
        return [...prev, saved];
      });
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.filter((i) => i.id !== tempId));
      setError(e instanceof Error && e.message ? e.message : "추가에 실패했습니다.");
    }
  }

  /** 여러 줄 붙여넣기: 한 날짜에 줄마다 항목 하나씩 */
  async function addItems(input: Omit<NewItem, "body" | "scheduleId"> & { bodies: string[] }) {
    const now = new Date().toISOString();
    const temps: WorkItem[] = input.bodies.map((body) => ({
      id: `tmp-${++tempSeq}`,
      date: input.date,
      body,
      status: input.status,
      projectId: input.projectId,
      projectName: input.projectId ? (projectNameById.get(input.projectId) ?? null) : null,
      scheduleId: null,
      sortOrder: Number.MAX_SAFE_INTEGER,
      createdAt: now,
    }));
    const tempIds = new Set(temps.map((t) => t.id));
    setItems((prev) => [...prev, ...temps]);
    setError(null);
    try {
      const saved = await createWorkItemsAction(input);
      setItems((prev) => {
        const savedIds = new Set(saved.map((i) => i.id));
        return [...prev.filter((i) => !tempIds.has(i.id) && !savedIds.has(i.id)), ...saved];
      });
      router.refresh();
    } catch (e) {
      setItems((prev) => prev.filter((i) => !tempIds.has(i.id)));
      setError(e instanceof Error && e.message ? e.message : "추가에 실패했습니다.");
    }
  }

  function patchLocal(id: string, patch: Partial<WorkItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    setOverdue((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  function toggleItem(item: WorkItem) {
    const next: WorkItemStatus = item.status === "done" ? "planned" : "done";
    const before = { items, overdue };
    patchLocal(item.id, { status: next });
    if (next === "done") setOverdue((prev) => prev.filter((i) => i.id !== item.id));
    void run(
      () => updateWorkItemAction(item.id, { status: next }),
      () => {
        setItems(before.items);
        setOverdue(before.overdue);
      },
      "상태 변경에 실패했습니다.",
    );
  }

  function saveItem(item: WorkItem, edit: { body: string; date: string; projectId: string | null }) {
    const before = items;
    // 체크한 항목을 다음 주 이후로 옮기면 다시 계획으로 (그 주가 되면 체크한다)
    const patch = needsUnchecking(item, edit.date) ? { ...edit, status: "planned" as const } : edit;
    patchLocal(item.id, {
      ...patch,
      projectName: patch.projectId ? (projectNameById.get(patch.projectId) ?? item.projectName) : null,
    });
    void run(
      () => updateWorkItemAction(item.id, patch),
      () => setItems(before),
      "수정에 실패했습니다.",
    );
  }

  /** 체크(완료)는 이번 주 일요일까지만. 그 뒤 날짜는 "다음 주 계획"이라 체크하지 않는다. */
  const checkableUntil = addDaysISO(currentWeekStart, 6);
  function needsUnchecking(item: WorkItem, date: string) {
    return item.status === "done" && date > checkableUntil;
  }

  function deleteItem(item: WorkItem) {
    if (!window.confirm(`"${item.body}" 항목을 삭제할까요?`)) return;
    const before = { items, overdue };
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setOverdue((prev) => prev.filter((i) => i.id !== item.id));
    void run(
      () => deleteWorkItemAction(item.id),
      () => {
        setItems(before.items);
        setOverdue(before.overdue);
      },
      "삭제에 실패했습니다.",
    );
  }

  function moveItems(targets: WorkItem[], date: string) {
    moveGroups([{ date, items: targets }]);
  }

  /** 여러 날짜로 나눠 옮기기: [{ date, items }] */
  function moveGroups(groups: { date: string; items: WorkItem[] }[]) {
    const targets = groups.flatMap((g) => g.items);
    if (targets.length === 0) return;
    const dateOf = new Map(groups.flatMap((g) => g.items.map((t) => [t.id, g.date] as const)));
    const before = { items, overdue };
    setOverdue((prev) => prev.filter((i) => !dateOf.has(i.id)));
    setItems((prev) => {
      const moved = prev.map((i) => (dateOf.has(i.id) ? { ...i, date: dateOf.get(i.id)! } : i));
      // 밀린 계획(이전 주)을 이번 주로 옮기면 화면 목록에 새로 들어온다.
      const incoming = targets
        .filter((t) => !prev.some((i) => i.id === t.id))
        .map((t) => ({ ...t, date: dateOf.get(t.id)! }));
      return [...moved, ...incoming];
    });
    void run(
      () =>
        Promise.all(
          groups.map((g) =>
            moveWorkItemsAction(
              g.items.map((t) => t.id),
              g.date,
            ),
          ),
        ).then(() => undefined),
      () => {
        setItems(before.items);
        setOverdue(before.overdue);
      },
      "옮기기에 실패했습니다.",
    );
  }

  // ── 끌어서 옮기기 ──
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // 휴대폰은 길게 눌러야 끌기 시작 (그냥 스크롤과 구분)
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDate, setOverDate] = useState<string | null>(null);
  const dragItem = dragId ? (sortedItems.find((i) => i.id === dragId) ?? null) : null;

  function dropTargetOf(over: DragOverEvent["over"]): { date: string; overId: string | null } | null {
    const data = over?.data.current as { date?: string; type?: string } | undefined;
    if (!over || !data?.date) return null;
    return { date: data.date, overId: data.type === "item" ? String(over.id) : null };
  }

  function handleDragStart(event: DragStartEvent) {
    setDragId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverDate(dropTargetOf(event.over)?.date ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragId(null);
    setOverDate(null);
    const target = dropTargetOf(event.over);
    if (!target) return;
    const plan = planDrop(sortedItems, String(event.active.id), target.date, target.overId);
    if (!plan || !plan.date) return;
    const date = plan.date;
    const order = new Map(plan.orderedIds.map((id, index) => [id, index]));
    const before = items;
    const dragged = sortedItems.find((i) => i.id === String(event.active.id));
    const uncheck = dragged && needsUnchecking(dragged, date) ? dragged.id : null;
    setItems((prev) =>
      prev.map((i) =>
        order.has(i.id)
          ? { ...i, date, sortOrder: order.get(i.id)!, ...(i.id === uncheck ? { status: "planned" as const } : {}) }
          : i,
      ),
    );
    void run(
      () =>
        Promise.all([
          reorderWorkItemsAction(plan.orderedIds, date),
          uncheck ? updateWorkItemAction(uncheck, { status: "planned" }) : null,
        ]),
      () => setItems(before),
      "옮기기에 실패했습니다.",
    );
  }

  const handlers: DayHandlers = {
    todayISO,
    projects,
    onAdd: addItem,
    onAddMany: addItems,
    onToggle: toggleItem,
    onSave: saveItem,
    onDelete: deleteItem,
    onMoveToToday: (item) => moveItems([item], todayISO),
    overDate,
    checkableUntil,
  };

  return (
    <section>
      <SectionHeader icon={CalendarCheck} title="주간 업무">
        <div className="flex items-center gap-1">
          <Link
            href={`/tasks?week=${addDaysISO(weekStart, -7)}`}
            aria-label="이전 주"
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
          <span className="text-ui-body text-muted">
            {formatMonthDayWeekday(weekStart)} ~ {formatMonthDayWeekday(addDaysISO(weekStart, 6))}
            {isCurrentWeek ? " (이번 주)" : ""}
          </span>
          <Link
            href={`/tasks?week=${nextWeekStart}`}
            aria-label="다음 주"
            className="rounded-md p-1 text-muted hover:bg-surface hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {!isCurrentWeek ? (
            <Link href="/tasks" className="ml-1 text-ui-body text-accent hover:underline">
              이번 주로
            </Link>
          ) : null}
        </div>
        {undatedCount > 0 ? (
          <a
            href="#undated-steps"
            title="프로젝트의 날짜 안 정한 남은 단계로 이동"
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-border px-2.5 py-1.5 text-ui-body text-muted hover:border-accent hover:text-accent"
          >
            날짜 미정 <b className="font-semibold text-foreground">{undatedCount}</b>건
          </a>
        ) : null}
        <button
          type="button"
          onClick={() => setShowReport((v) => !v)}
          aria-expanded={showReport}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-ui-body font-medium ${
            showReport
              ? "border-accent bg-accent/10 text-accent"
              : isFriday && isCurrentWeek
                ? "border-accent bg-accent text-accent-foreground hover:bg-accent-hover"
                : "border-border text-foreground hover:bg-surface-hover"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" aria-hidden="true" />
          주간업무보고 {showReport ? "닫기" : "만들기"}
        </button>
      </SectionHeader>

      {error ? (
        <p role="alert" className="mb-3 text-ui-body text-danger">
          {error}
        </p>
      ) : null}

      {isCurrentWeek && overdue.length > 0 ? (
        <OverdueBar
          items={overdue}
          onMoveAll={() => moveItems(overdue, todayISO)}
          onMoveOne={(i) => moveItems([i], todayISO)}
        />
      ) : null}

      {showReport ? (
        <ReportPanel
          report={report}
          onMoveUnfinished={() => moveGroups(spreadAcrossWeek(report.unfinished, nextWeekStart, holidays))}
        />
      ) : null}

      <DndContext
        id="week-planner-dnd"
        sensors={sensors}
        collisionDetection={itemFirstCollision}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setDragId(null);
          setOverDate(null);
        }}
      >
        <WeekGrid
          label="이번 주"
          weekStart={weekStart}
          items={sortedItems}
          schedules={schedules}
          holidays={holidays}
          handlers={handlers}
        />
        <div className="mt-5">
          <WeekGrid
            label="다음 주 계획"
            weekStart={nextWeekStart}
            items={sortedItems}
            schedules={schedules}
            holidays={holidays}
            handlers={handlers}
            compact
          />
        </div>
        <DragOverlay>
          {dragItem ? (
            <div className="max-w-[16rem] rounded-md border border-accent bg-surface px-2 py-1 text-ui-body text-foreground shadow-lg">
              {dragItem.body}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

type DayHandlers = {
  todayISO: string;
  projects: ProjectOption[];
  onAdd: (input: NewItem) => void;
  onAddMany: (input: Omit<NewItem, "body" | "scheduleId"> & { bodies: string[] }) => void;
  onToggle: (item: WorkItem) => void;
  /** 이 날짜까지만 체크할 수 있다 (이번 주 일요일) */
  checkableUntil: string;
  onSave: (item: WorkItem, patch: { body: string; date: string; projectId: string | null }) => void;
  onDelete: (item: WorkItem) => void;
  onMoveToToday: (item: WorkItem) => void;
  /** 끌고 있는 항목이 올라가 있는 날짜 (칸 강조용) */
  overDate: string | null;
};

/** 항목 위에 있으면 항목을, 아니면 날짜 칸을 놓을 곳으로 본다. */
const itemFirstCollision: CollisionDetection = (args) => {
  const hits = pointerWithin(args);
  const found = hits.length > 0 ? hits : rectIntersection(args);
  const items = found.filter((c) => !String(c.id).startsWith("day:"));
  return items.length > 0 ? items : found;
};

const GRID_COLS: Record<number, string> = {
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
  7: "lg:grid-cols-7",
};

function WeekGrid({
  label,
  weekStart,
  items,
  schedules,
  holidays,
  handlers,
  compact = false,
}: {
  label: string;
  weekStart: string;
  items: WorkItem[];
  schedules: Schedule[];
  holidays: Record<string, string[]>;
  handlers: DayHandlers;
  compact?: boolean;
}) {
  const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(weekStart, i));
  const schedulesOn = (date: string) => schedules.filter((s) => s.startDate <= date && s.endDate >= date);
  const itemsOn = (date: string) => items.filter((i) => i.date === date);
  // 평일 5칸은 항상, 주말은 항목이나 일정이 있을 때만 칸을 만든다.
  const visible = dates.filter((date, index) => index < 5 || itemsOn(date).length > 0 || schedulesOn(date).length > 0);
  const doneCount = items.filter((i) => i.status === "done" && dates.includes(i.date)).length;
  const plannedCount = items.filter((i) => i.status === "planned" && dates.includes(i.date)).length;
  // 휴대폰에서는 한 번에 하루만 보여준다 (기본: 오늘, 없으면 첫날).
  const [mobileDate, setMobileDate] = useState<string | null>(null);
  const shownDate =
    mobileDate && visible.includes(mobileDate)
      ? mobileDate
      : visible.includes(handlers.todayISO)
        ? handlers.todayISO
        : visible[0];

  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-ui-title font-semibold text-foreground">{label}</h3>
        <span className="text-ui-meta text-muted">
          완료 {doneCount} · 계획 {plannedCount}
        </span>
      </div>
      <div role="tablist" aria-label={`${label} 요일`} className="mb-2 flex gap-1 overflow-x-auto sm:hidden">
        {visible.map((date) => {
          const isShown = date === shownDate;
          const count = itemsOn(date).length;
          return (
            <button
              key={date}
              type="button"
              role="tab"
              aria-selected={isShown}
              onClick={() => setMobileDate(date)}
              className={`flex min-w-[3rem] flex-1 flex-col items-center rounded-lg border py-1 leading-tight ${
                isShown
                  ? "border-accent bg-accent text-white"
                  : date === handlers.todayISO
                    ? "border-accent text-accent"
                    : "border-border text-foreground"
              }`}
            >
              <span className="text-ui-body font-semibold">{WEEKDAY_LABELS[getWeekdayIndex(date)]}</span>
              <span className="text-ui-meta opacity-80">
                {Number(date.slice(8, 10))}
                {count > 0 ? ` · ${count}` : ""}
              </span>
            </button>
          );
        })}
      </div>
      <div className={`grid gap-3 sm:grid-cols-2 ${GRID_COLS[visible.length]}`}>
        {visible.map((date) => (
          <DayColumn
            key={date}
            hiddenOnMobile={date !== shownDate}
            date={date}
            items={itemsOn(date)}
            schedules={schedulesOn(date)}
            holidayNames={holidays[date] ?? []}
            handlers={handlers}
            compact={compact}
          />
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  items,
  schedules,
  holidayNames,
  handlers,
  compact,
  hiddenOnMobile = false,
}: {
  hiddenOnMobile?: boolean;
  date: string;
  items: WorkItem[];
  schedules: Schedule[];
  holidayNames: string[];
  handlers: DayHandlers;
  compact: boolean;
}) {
  const weekday = getWeekdayIndex(date);
  const isToday = date === handlers.todayISO;
  const isPast = date < handlers.todayISO;
  const isRedDay = holidayNames.length > 0 || weekday === 6;
  const dateColor = isRedDay ? "text-red-500" : weekday === 5 ? "text-blue-500" : "text-foreground";
  const { setNodeRef } = useDroppable({ id: `day:${date}`, data: { date, type: "day" } });
  const isDropTarget = handlers.overDate === date;

  return (
    <div
      ref={setNodeRef}
      className={`${hiddenOnMobile ? "hidden sm:flex" : "flex"} min-w-0 flex-col rounded-2xl border bg-surface p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
        isDropTarget
          ? "border-accent bg-accent/[0.04] ring-2 ring-accent/40"
          : isToday
            ? "border-accent ring-1 ring-accent/30"
            : "border-border"
      } ${compact ? "min-h-[7rem]" : "min-h-[12rem]"}`}
    >
      <div className="flex items-baseline gap-1.5">
        <span className={`text-ui-head font-semibold ${dateColor}`}>
          {Number(date.slice(8, 10))} ({WEEKDAY_LABELS[weekday]})
        </span>
        {isToday ? (
          <span className="rounded-full bg-accent/10 px-1.5 py-px text-ui-tiny font-semibold text-accent">오늘</span>
        ) : null}
        {holidayNames.length > 0 ? (
          <span className="truncate text-ui-meta text-red-500">{holidayNames.join(" · ")}</span>
        ) : null}
      </div>

      {schedules.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {schedules.map((schedule) => (
            <ScheduleChip
              key={schedule.id}
              schedule={schedule}
              date={date}
              isLinked={items.some((i) => i.scheduleId === schedule.id)}
              onAdd={() =>
                handlers.onAdd({
                  date,
                  body: scheduleText(schedule),
                  status: date <= handlers.todayISO ? "done" : "planned",
                  projectId: null,
                  scheduleId: schedule.id,
                })
              }
            />
          ))}
        </ul>
      ) : null}

      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.length > 0 ? (
          <ul className="mt-2 flex flex-col">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} isOverdue={isPast && item.status === "planned"} handlers={handlers} />
            ))}
          </ul>
        ) : null}
      </SortableContext>

      <AddItemInput date={date} handlers={handlers} />
    </div>
  );
}

function scheduleText(schedule: Schedule): string {
  const who = schedule.employeeLabel ? ` (${schedule.employeeLabel})` : "";
  return `${schedule.title}${who}`;
}

/** 연간일정에서 온 일정: 흐리게 보여주고, + 를 누르면 그날 업무 항목으로 담는다 (한 방향). */
function ScheduleChip({
  schedule,
  date,
  isLinked,
  onAdd,
}: {
  schedule: Schedule;
  date: string;
  isLinked: boolean;
  onAdd: () => void;
}) {
  const dot = CATEGORY_COLORS[schedule.category]?.dot ?? "bg-slate-300";
  return (
    <li className="group/schedule flex items-center gap-1.5 rounded-md border border-dashed border-border px-1.5 py-1 text-ui-meta text-muted">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="shrink-0 font-medium">{schedule.category}</span>
      <span className="min-w-0 flex-1 truncate" title={scheduleText(schedule)}>
        {scheduleText(schedule)}
      </span>
      {isLinked ? (
        <Check className="h-3 w-3 shrink-0 text-accent" aria-label="업무에 담김" />
      ) : (
        <button
          type="button"
          onClick={onAdd}
          aria-label={`${schedule.title} 일정을 ${Number(date.slice(8, 10))}일 업무로 담기`}
          title="업무 항목으로 담기"
          className="shrink-0 rounded p-0.5 text-muted hover:bg-accent/10 hover:text-accent"
        >
          <Plus className="h-3 w-3" aria-hidden="true" />
        </button>
      )}
    </li>
  );
}

function ItemRow({ item, isOverdue, handlers }: { item: WorkItem; isOverdue: boolean; handlers: DayHandlers }) {
  const [isEditing, setIsEditing] = useState(false);
  const isTemp = item.id.startsWith("tmp-");
  const isDone = item.status === "done";
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { date: item.date, type: "item" },
    disabled: isTemp || isEditing,
  });
  const dragStyle = { transform: CSS.Translate.toString(transform), transition };

  if (isEditing) {
    return (
      <li ref={setNodeRef} className="py-1">
        <ItemEditor
          item={item}
          projects={handlers.projects}
          onCancel={() => setIsEditing(false)}
          onSave={(patch) => {
            handlers.onSave(item, patch);
            setIsEditing(false);
          }}
          onDelete={() => handlers.onDelete(item)}
        />
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={dragStyle}
      {...attributes}
      {...listeners}
      role={undefined}
      tabIndex={-1}
      className={`group/item relative -mx-1 flex cursor-grab items-start gap-1.5 rounded-md px-1 py-[0.3rem] hover:bg-bg active:cursor-grabbing ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      {!isDone && item.date > handlers.checkableUntil ? (
        <span
          className="mt-[0.12rem] flex h-[0.8rem] w-[0.8rem] shrink-0 items-center justify-center"
          title="다음 주 계획은 그 주가 되면 체크합니다"
          aria-hidden="true"
        >
          <span className="h-[0.3rem] w-[0.3rem] rounded-full bg-slate-400 dark:bg-slate-500" />
        </span>
      ) : (
        <button
          type="button"
          onClick={() => handlers.onToggle(item)}
          disabled={isTemp}
          aria-label={`${item.body} ${isDone ? "완료 취소" : "완료"}`}
          aria-pressed={isDone}
          className={`mt-[0.12rem] flex h-[0.8rem] w-[0.8rem] shrink-0 items-center justify-center rounded border ${
            isDone
              ? "border-accent bg-accent text-accent-foreground"
              : isOverdue
                ? "border-amber-400"
                : "border-slate-300 dark:border-slate-500"
          }`}
        >
          {isDone ? <Check className="h-[0.6rem] w-[0.6rem]" strokeWidth={3} aria-hidden="true" /> : null}
        </button>
      )}
      <div className="min-w-0 flex-1">
        {/* 한글은 단어 중간에서 끊지 않고(keep-all) 띄어쓰기에서만 줄을 바꾼다. 프로젝트 태그는 따로 줄을 쓰지 않고 내용 뒤에 붙인다. */}
        <p
          className={`whitespace-pre-wrap break-keep [overflow-wrap:anywhere] text-ui-body leading-[1.45] ${
            isDone ? "text-foreground" : isOverdue ? "text-amber-700 dark:text-amber-300" : "text-muted"
          }`}
        >
          <span>{item.body}</span>
          {item.projectName ? (
            <span className="ml-1.5 whitespace-nowrap text-ui-meta font-normal text-muted">#{item.projectName}</span>
          ) : null}
        </p>
      </div>
      {isOverdue ? (
        <button
          type="button"
          onClick={() => handlers.onMoveToToday(item)}
          title="오늘로 옮기기"
          className="mt-px shrink-0 rounded px-1 text-ui-meta text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-400/10"
        >
          오늘로
        </button>
      ) : null}
      {!isTemp ? (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label={`${item.body} 수정`}
          className="mt-px shrink-0 rounded p-0.5 text-muted opacity-0 hover:text-foreground focus:opacity-100 [@media(hover:none)]:opacity-100 group-hover/item:opacity-100 [@media(hover:hover)]:absolute [@media(hover:hover)]:right-0.5 [@media(hover:hover)]:top-[0.25rem] [@media(hover:hover)]:bg-bg"
        >
          <Pencil className="h-3 w-3" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}

const FIELD =
  "w-full min-w-0 rounded-md border border-border bg-bg px-2 py-1 text-ui-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

function ItemEditor({
  item,
  projects,
  onSave,
  onCancel,
  onDelete,
}: {
  item: WorkItem;
  projects: ProjectOption[];
  onSave: (patch: { body: string; date: string; projectId: string | null }) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [body, setBody] = useState(item.body);
  const [date, setDate] = useState(item.date);
  const [projectId, setProjectId] = useState(item.projectId ?? "");

  function save() {
    if (!body.trim() || !date) return;
    onSave({ body: body.trim(), date, projectId: projectId || null });
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-accent p-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            save();
          }
          if (e.key === "Escape") onCancel();
        }}
        rows={2}
        autoFocus
        aria-label="내용"
        className={FIELD}
      />
      <div className="grid grid-cols-2 gap-1.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="날짜" className={FIELD} />
        <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} fallbackName={item.projectName} />
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={save}
          disabled={!body.trim() || !date}
          className="rounded-md bg-accent px-2.5 py-1 text-ui-meta font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          저장
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-border px-2.5 py-1 text-ui-meta text-muted"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="삭제"
          className="ml-auto rounded-md p-1 text-danger hover:bg-bg"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function ProjectSelect({
  projects,
  value,
  onChange,
  fallbackName,
}: {
  projects: ProjectOption[];
  value: string;
  onChange: (value: string) => void;
  fallbackName?: string | null;
}) {
  // 이미 완료된 프로젝트에 걸린 항목도 수정할 때 연결이 풀리지 않게 선택지에 남겨둔다.
  const hasValue = !value || projects.some((p) => p.id === value);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="프로젝트" className={FIELD}>
      <option value="">프로젝트 없음</option>
      {!hasValue ? <option value={value}>{fallbackName ?? "완료된 프로젝트"}</option> : null}
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

/** 칸 맨 아래 한 줄 입력. 오늘·지난 날은 "한 일"(완료), 앞으로의 날은 "할 일"(계획)로 들어간다. */
function AddItemInput({ date, handlers }: { date: string; handlers: DayHandlers }) {
  const [body, setBody] = useState("");
  const [projectId, setProjectId] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isFuture = date > handlers.todayISO;

  function submit() {
    const text = body.trim();
    if (!text) return;
    handlers.onAdd({
      date,
      body: text,
      status: isFuture ? "planned" : "done",
      projectId: projectId || null,
    });
    setBody("");
  }

  /** 엑셀 "1. … 2. …" 칸처럼 여러 줄이면 줄마다 항목으로 넣는다. 한 줄이면 평소처럼 붙여넣기. */
  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const bodies = splitPastedLines(e.clipboardData.getData("text/plain"));
    if (bodies.length < 2) return;
    e.preventDefault();
    handlers.onAddMany({ date, bodies, status: isFuture ? "planned" : "done", projectId: projectId || null });
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중 Enter는 글자 확정이라 무시한다.
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      setBody("");
      (e.target as HTMLInputElement).blur();
    }
  }

  const showOptions = isFocused || body.length > 0;

  return (
    <div
      ref={wrapRef}
      className="mt-auto pt-2"
      onFocus={() => setIsFocused(true)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setIsFocused(false);
      }}
    >
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        placeholder={isFuture ? "+ 할 일 계획" : "+ 한 일 적기"}
        aria-label={`${formatMonthDayWeekday(date)} ${isFuture ? "할 일 계획" : "한 일 적기"}`}
        className="w-full min-w-0 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-ui-body text-foreground placeholder:text-muted hover:border-border focus:border-border focus:bg-bg focus:outline-none"
      />
      {showOptions ? (
        <div className="mt-1 flex items-center gap-1.5">
          <ProjectSelect projects={handlers.projects} value={projectId} onChange={setProjectId} />
          <span className="shrink-0 text-ui-tiny text-muted" title="여러 줄을 붙여넣으면 줄마다 하나씩 들어갑니다">
            Enter · 여러 줄 붙여넣기
          </span>
        </div>
      ) : null}
    </div>
  );
}

function OverdueBar({
  items,
  onMoveAll,
  onMoveOne,
}: {
  items: WorkItem[];
  onMoveAll: () => void;
  onMoveOne: (item: WorkItem) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-ui-body text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100">
      <div className="flex flex-wrap items-center gap-2">
        <span>
          지난주까지 계획했지만 체크하지 않은 일 <strong>{items.length}건</strong>
        </span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="underline-offset-2 hover:underline">
          {open ? "접기" : "보기"}
        </button>
        <button
          type="button"
          onClick={onMoveAll}
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-amber-400 px-2 py-0.5 font-medium hover:bg-amber-100 dark:hover:bg-amber-400/20"
        >
          모두 오늘로 <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <ul className="mt-2 flex flex-col gap-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <span className="shrink-0 text-ui-meta opacity-70">{formatMonthDayWeekday(item.date)}</span>
              <span className="min-w-0 flex-1 truncate">{item.body}</span>
              <button type="button" onClick={() => onMoveOne(item)} className="shrink-0 hover:underline">
                오늘로
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** 엑셀 양식과 같은 모양의 미리보기 + 복사. */
function ReportPanel({
  report,
  onMoveUnfinished,
}: {
  report: ReturnType<typeof buildWeeklyReport>;
  onMoveUnfinished: () => void;
}) {
  return (
    <div className="mb-5 rounded-2xl border border-accent/30 bg-surface p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-ui-title font-semibold text-foreground">
          주간업무보고 미리보기
          {report.inAdvance ? (
            <span className="ml-1.5 rounded-full bg-amber-100 px-2 py-px text-ui-meta font-semibold text-amber-800 dark:bg-amber-400/15 dark:text-amber-200">
              미리 쓰는 보고서
            </span>
          ) : null}
        </p>
        <span className="text-ui-meta text-muted">
          {report.inAdvance
            ? "아직 오지 않은 주라서 적어둔 계획이 모두 '한 일' 칸에 들어갑니다 (명절 전 미리 제출용)."
            : "이번 주는 체크한(완료) 항목만, 다음 주는 적어둔 계획이 들어갑니다."}
        </span>
        <CopyButton text={toExcelText(report)} label="엑셀용 복사" className="ml-auto" />
      </div>
      <p className="mt-1 text-ui-meta text-muted">
        엑셀에서 내 이름 줄의 <strong className="text-foreground">&quot;日&quot; 머리칸</strong>을 선택하고 붙여넣으면
        기간 제목과 월~일 7줄이 한 번에 채워집니다.
      </p>

      {report.unfinished.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-bg px-3 py-1.5 text-ui-meta text-muted">
          <span>
            이번 주에 못 한 계획 <strong className="text-foreground">{report.unfinished.length}건</strong>은 보고서에서
            빠졌습니다.
          </span>
          <button
            type="button"
            onClick={onMoveUnfinished}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 font-medium text-foreground hover:bg-surface-hover"
          >
            다음 주로 나눠 옮기기 (하루 3건씩) <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-ui-body">
          <thead>
            <tr className="bg-accent/[0.08] text-foreground">
              <th className="w-8 border border-border px-1 py-1">日</th>
              <th className="w-10 border border-border px-1 py-1">요일</th>
              <th className="border border-border px-2 py-1">{report.thisWeekTitle}</th>
              <th className="w-8 border border-border px-1 py-1">日</th>
              <th className="w-10 border border-border px-1 py-1">요일</th>
              <th className="border border-border px-2 py-1">{report.nextWeekTitle}</th>
            </tr>
          </thead>
          <tbody>
            {report.thisWeek.map((a, i) => {
              const b = report.nextWeek[i];
              const color = i === 6 ? "text-red-500" : i === 5 ? "text-blue-500" : "text-foreground";
              return (
                <tr key={a.date} className="align-top">
                  <td className={`border border-border px-1 py-1 text-center ${color}`}>{a.day}</td>
                  <td className={`border border-border px-1 py-1 text-center ${color}`}>{a.weekday}</td>
                  <td className="whitespace-pre-wrap border border-border px-2 py-1 text-foreground">
                    {a.lines.join("\n")}
                  </td>
                  <td className={`border border-border px-1 py-1 text-center ${color}`}>{b.day}</td>
                  <td className={`border border-border px-1 py-1 text-center ${color}`}>{b.weekday}</td>
                  <td className="whitespace-pre-wrap border border-border px-2 py-1 text-foreground">
                    {b.lines.join("\n")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
