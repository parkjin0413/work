"use client";

import { useEffect, useState } from "react";
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
  verticalListSortingStrategy,
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

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

type DragItemData = { departmentId: string };

function matchesQuery(employee: EmployeeSummary, departmentName: string, query: string): boolean {
  if (!query) return true;
  const haystack = [employee.name, employee.partnerName, departmentName, employee.position]
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

      {viewMode === "grouped"
        ? departments.map((department) => {
            const filteredEmployees = department.employees.filter((employee) =>
              matchesQuery(employee, department.name, query)
            );

            if (isSearching && filteredEmployees.length === 0) return null;

            return (
              <section key={department.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-foreground">
                    {department.name}{" "}
                    <span className="text-sm font-normal text-muted">{department.employees.length}명</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <DepartmentRowActions departmentId={department.id} currentName={department.name} />
                    <CreateEmployeeForm departmentId={department.id} partners={partnerOptions} />
                  </div>
                </div>

                {filteredEmployees.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">등록된 직원이 없습니다.</p>
                ) : isSearching ? (
                  <div className="mt-3 flex flex-col gap-2">
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
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="mt-3 flex flex-col gap-2">
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
          })
        : null}
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
