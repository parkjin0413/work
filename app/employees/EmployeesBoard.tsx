"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Search } from "lucide-react";
import type { DepartmentWithEmployees, EmployeeSummary } from "@/lib/employees/employeesStore";
import type { Partner } from "@/lib/partners/partnersStore";
import { DepartmentRowActions } from "./DepartmentRowActions";
import { CreateDepartmentForm } from "./CreateDepartmentForm";
import { CreateEmployeeForm } from "./CreateEmployeeForm";
import { EmployeeRow } from "./EmployeeRow";
import { EmployeesTable } from "./EmployeesTable";
import { reorderEmployeesAction } from "./actions";

type ViewMode = "grouped" | "flat";

/**
 * 부서 배치: 내용 폭을 N칸으로 나누고, 부서마다 "인원수만큼" 칸을 차지해 왼쪽부터 채운다.
 * 칸 수는 브라우저 폭이 아니라 실제 내용 폭(최대 1920px)을 재서, 카드 한 장이 약 280px 아래로
 * 좁아지지 않는 가장 큰 값으로 정한다. 1920px 폭이면 6칸.
 */
const COLUMN_CHOICES = [8, 6, 5, 4, 3, 2, 1];
const MIN_CARD_WIDTH = 280;
const CARD_GAP = 8;

function useColumnCount(ref: RefObject<HTMLElement>): number {
  const [columns, setColumns] = useState(4);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const fit = COLUMN_CHOICES.find((n) => (width - CARD_GAP * (n - 1)) / n >= MIN_CARD_WIDTH) ?? 1;
      setColumns(fit);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return columns;
}

/** 부서 제목 아래 선 색 (파스텔). 배경은 칠하지 않아 화면이 가볍다. */
const DEPARTMENT_LINES = [
  "border-sky-300 dark:border-sky-400/50",
  "border-violet-300 dark:border-violet-400/50",
  "border-emerald-300 dark:border-emerald-400/50",
  "border-amber-300 dark:border-amber-400/50",
  "border-rose-300 dark:border-rose-400/50",
  "border-teal-300 dark:border-teal-400/50",
  "border-indigo-300 dark:border-indigo-400/50",
  "border-orange-300 dark:border-orange-400/50",
];

/** 부서 순서대로 색을 돌려 써서, 바로 옆 부서끼리는 항상 다른 색이 된다. */
function departmentLine(index: number) {
  return DEPARTMENT_LINES[index % DEPARTMENT_LINES.length];
}

/** 부서 안 직원 카드 줄. 수정 중인 카드는 입력 칸이 비좁지 않게 그 부서 폭 전체를 쓴다. */
const EMPLOYEE_GRID_CLASS = "mt-3 grid gap-2 [&>*:has([data-employee-editing])]:col-span-full";

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

type DragItemData = { departmentId: string };

function matchesQuery(employee: EmployeeSummary, departmentName: string, query: string): boolean {
  if (!query) return true;
  const haystack = [
    employee.name,
    employee.partnerName,
    departmentName,
    employee.position,
    employee.phone,
    employee.carNumber,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function EmployeesBoard({
  departments: initialDepartments,
  partners,
}: {
  departments: DepartmentWithEmployees[];
  partners: Partner[];
}) {
  const [departments, setDepartments] = useState(initialDepartments);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDepartments(initialDepartments);
  }, [initialDepartments]);

  const departmentOptions = departments.map((department) => ({ id: department.id, name: department.name }));
  const partnerOptions = partners.map((partner) => ({ id: partner.id, companyName: partner.companyName }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragItemData | undefined;
    if (!data) return;

    const department = departments.find((d) => d.id === data.departmentId);
    setActiveLabel(department?.employees.find((employee) => employee.id === event.active.id)?.name ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const data = active.data.current as DragItemData | undefined;
    if (!data) return;

    const departmentIndex = departments.findIndex((d) => d.id === data.departmentId);
    if (departmentIndex === -1) return;

    const employees = departments[departmentIndex].employees;
    const oldIndex = employees.findIndex((employee) => employee.id === active.id);
    const newIndex = employees.findIndex((employee) => employee.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousDepartments = departments;
    const reordered = arrayMove(employees, oldIndex, newIndex);
    const nextDepartments = departments.map((department, index) =>
      index === departmentIndex ? { ...department, employees: reordered } : department
    );
    setDepartments(nextDepartments);
    setErrorMessage(null);

    try {
      await reorderEmployeesAction(reordered.map((employee) => employee.id));
    } catch {
      setDepartments(previousDepartments);
      setErrorMessage("직원 순서 변경에 실패했습니다.");
    }
  }

  const isSearching = query.trim().length > 0;
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = useColumnCount(gridRef);

  const flatGroups = departments
    .map((department) => ({
      departmentId: department.id,
      departmentName: department.name,
      employees: department.employees.filter((employee) => matchesQuery(employee, department.name, query)),
    }))
    .filter((group) => group.employees.length > 0);
  const flatTotalCount = flatGroups.reduce((sum, group) => sum + group.employees.length, 0);

  return (
    <div className="mt-6 flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름, 소속, 부서, 직급 검색"
            aria-label="직원 검색"
            className="rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            aria-pressed={viewMode === "grouped"}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === "grouped" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            부서별 관리
          </button>
          <button
            type="button"
            onClick={() => setViewMode("flat")}
            aria-pressed={viewMode === "flat"}
            className={`rounded-md px-3 py-1 text-sm font-medium ${
              viewMode === "flat" ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            전직원 한눈보기
          </button>
        </div>

        <CreateDepartmentForm />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {viewMode === "flat" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">전체 {flatTotalCount}명</p>
          <EmployeesTable groups={flatGroups} />
        </div>
      ) : null}

      {viewMode === "grouped" ? (
        <div ref={gridRef} className="grid gap-x-6 gap-y-8" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {departments.map((department, departmentIndex) => {
            const line = departmentLine(departmentIndex);
            const filteredEmployees = department.employees.filter((employee) =>
              matchesQuery(employee, department.name, query)
            );

            if (isSearching && filteredEmployees.length === 0) return null;

            // 인원수만큼 칸을 차지 (최소 1칸, 최대 전체 칸). 직원 추가·수정 중에는 부서 폭 전체를 쓴다.
            const span = Math.max(1, Math.min(filteredEmployees.length, columns));

            return (
              <section
                key={department.id}
                style={{ gridColumn: `span ${span} / span ${span}` }}
                className="min-w-0 has-[form]:!col-span-full has-[[data-employee-editing]]:!col-span-full"
              >
                <div className={`group/dept flex min-h-9 items-center justify-between gap-2 border-b-2 pb-1 ${line}`}>
                  <h2 className="min-w-0 truncate text-[0.85rem] font-bold text-foreground">
                    {department.name}{" "}
                    <span className="text-sm font-medium text-muted">{department.employees.length}명</span>
                  </h2>
                  <div className="flex shrink-0 items-center sm:opacity-0 sm:group-focus-within/dept:opacity-100 sm:group-hover/dept:opacity-100 sm:has-[form]:opacity-100 sm:has-[input]:opacity-100">
                    <DepartmentRowActions departmentId={department.id} currentName={department.name} />
                    <CreateEmployeeForm departmentId={department.id} partners={partnerOptions} />
                  </div>
                </div>

                {filteredEmployees.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">등록된 직원이 없습니다.</p>
                ) : isSearching ? (
                  <div className={EMPLOYEE_GRID_CLASS} style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
                    {filteredEmployees.map((employee) => (
                      <EmployeeRow
                        key={employee.id}
                        employee={employee}
                        departmentId={department.id}
                        departments={departmentOptions}
                        partners={partnerOptions}
                      />
                    ))}
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onDragCancel={() => setActiveLabel(null)}
                  >
                    <SortableContext
                      items={filteredEmployees.map((employee) => employee.id)}
                      strategy={rectSortingStrategy}
                    >
                      <div className={EMPLOYEE_GRID_CLASS} style={{ gridTemplateColumns: `repeat(${span}, minmax(0, 1fr))` }}>
                        {filteredEmployees.map((employee) => (
                          <SortableEmployeeRow
                            key={employee.id}
                            employee={employee}
                            departmentId={department.id}
                            departments={departmentOptions}
                            partners={partnerOptions}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    <DragOverlay>
                      {activeLabel ? (
                        <div className="rounded-xl border border-accent bg-surface px-4 py-2.5 text-sm font-medium text-foreground shadow-lg">
                          {activeLabel}
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>
                )}
              </section>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function SortableEmployeeRow({
  employee,
  departmentId,
  departments,
  partners,
}: {
  employee: EmployeeSummary;
  departmentId: string;
  departments: { id: string; name: string }[];
  partners: { id: string; companyName: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: employee.id,
    data: { departmentId } satisfies DragItemData,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragHandleProps: DragHandleProps = { attributes, listeners };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <EmployeeRow
        employee={employee}
        departmentId={departmentId}
        departments={departments}
        partners={partners}
        dragHandleProps={dragHandleProps}
      />
    </div>
  );
}
