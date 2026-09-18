"use client";

import { useEffect, useState } from "react";
import type { EmployeeSummary } from "@/lib/employees/employeesStore";
import { formatBirthday } from "./formatBirthday";

type Group = { departmentId: string; departmentName: string; employees: EmployeeSummary[] };

// 부서 카드 높이는 "헤더 1줄 + 직원 수" 에 거의 비례하므로, 이 가중치를 기준으로
// 매번 가장 짧은 열에 다음 부서를 배정한다 (실제 매스너리 패킹).
function distributeGroups(groups: Group[], columnCount: number): Group[][] {
  const columns: Group[][] = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);

  for (const group of groups) {
    const weight = 1 + group.employees.length;
    let target = 0;
    for (let i = 1; i < columnCount; i++) {
      if (heights[i] < heights[target]) target = i;
    }
    columns[target].push(group);
    heights[target] += weight;
  }

  return columns;
}

function useColumnCount(): number {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    function update() {
      if (window.innerWidth < 640) setColumnCount(1);
      else if (window.innerWidth < 1024) setColumnCount(2);
      else setColumnCount(3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columnCount;
}

export function EmployeesTable({ groups }: { groups: Group[] }) {
  const columnCount = useColumnCount();

  if (groups.length === 0) {
    return <p className="text-sm text-muted">검색 결과가 없습니다.</p>;
  }

  const columns = distributeGroups(groups, columnCount);

  return (
    <div className="flex gap-4">
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className="flex min-w-0 flex-1 flex-col gap-4">
          {column.map((group) => (
            <div key={group.departmentId} className="overflow-hidden rounded-2xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border bg-bg px-4 py-2.5">
                <h3 className="text-sm font-semibold text-foreground">{group.departmentName}</h3>
                <span className="text-xs text-muted">{group.employees.length}명</span>
              </div>

              <div className="flex flex-col divide-y divide-border">
                {group.employees.map((employee) => {
                  const birthdayText = formatBirthday(
                    employee.birthdayMonth,
                    employee.birthdayDay,
                    employee.birthdayCalendar
                  );
                  const affiliationText = [employee.partnerName, employee.workLocation]
                    .filter(Boolean)
                    .join(" · ");

                  return (
                    <div key={employee.id} className="px-4 py-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {employee.name}
                          {employee.position ? (
                            <span className="ml-1 text-xs font-normal text-muted">{employee.position}</span>
                          ) : null}
                          {employee.statusNote ? (
                            <span className="ml-1 text-xs font-normal text-muted">
                              ({employee.statusNote})
                            </span>
                          ) : null}
                        </span>
                        {employee.phone ? (
                          <a
                            href={`tel:${employee.phone.replace(/[^0-9]/g, "")}`}
                            className="shrink-0 text-xs font-medium text-accent hover:underline"
                          >
                            {employee.phone}
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-muted">-</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2">
                        <span className="min-w-0 truncate text-xs text-muted">{affiliationText || "-"}</span>
                        <span className="shrink-0 text-xs text-muted">{birthdayText ?? "-"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
