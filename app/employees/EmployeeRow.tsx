"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { BirthdayCalendar, EmployeeSummary } from "@/lib/employees/employeesStore";
import type { DragHandleProps } from "./EmployeesBoard";
import { updateEmployeeAction, deleteEmployeeAction } from "./actions";
import { formatBirthday } from "./formatBirthday";

export function EmployeeRow({
  employee,
  departmentId,
  departments,
  partners,
  dragHandleProps,
}: {
  employee: EmployeeSummary;
  departmentId: string;
  departments: { id: string; name: string }[];
  partners: { id: string; companyName: string }[];
  dragHandleProps?: DragHandleProps;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editDepartmentId, setEditDepartmentId] = useState(departmentId);
  const [editName, setEditName] = useState(employee.name);
  const [editPosition, setEditPosition] = useState(employee.position ?? "");
  const [editStatusNote, setEditStatusNote] = useState(employee.statusNote ?? "");
  const [editPartnerId, setEditPartnerId] = useState(employee.partnerId ?? "");
  const [editWorkLocation, setEditWorkLocation] = useState(employee.workLocation ?? "");
  const [editPhone, setEditPhone] = useState(employee.phone ?? "");
  const [editBirthdayMonth, setEditBirthdayMonth] = useState(employee.birthdayMonth?.toString() ?? "");
  const [editBirthdayDay, setEditBirthdayDay] = useState(employee.birthdayDay?.toString() ?? "");
  const [editBirthdayCalendar, setEditBirthdayCalendar] = useState<BirthdayCalendar>(
    employee.birthdayCalendar ?? "solar"
  );

  function resetEditFields() {
    setEditDepartmentId(departmentId);
    setEditName(employee.name);
    setEditPosition(employee.position ?? "");
    setEditStatusNote(employee.statusNote ?? "");
    setEditPartnerId(employee.partnerId ?? "");
    setEditWorkLocation(employee.workLocation ?? "");
    setEditPhone(employee.phone ?? "");
    setEditBirthdayMonth(employee.birthdayMonth?.toString() ?? "");
    setEditBirthdayDay(employee.birthdayDay?.toString() ?? "");
    setEditBirthdayCalendar(employee.birthdayCalendar ?? "solar");
    setErrorMessage(null);
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await updateEmployeeAction({
        id: employee.id,
        departmentId: editDepartmentId,
        name: editName,
        position: editPosition,
        statusNote: editStatusNote,
        partnerId: editPartnerId,
        workLocation: editWorkLocation,
        phone: editPhone,
        birthdayMonth: editBirthdayMonth,
        birthdayDay: editBirthdayDay,
        birthdayCalendar: editBirthdayCalendar,
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteEmployeeAction(employee.id);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-accent bg-surface p-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={editDepartmentId}
            onChange={(e) => setEditDepartmentId(e.target.value)}
            aria-label="부서"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          >
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            aria-label="이름"
            placeholder="이름"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={editPosition}
            onChange={(e) => setEditPosition(e.target.value)}
            aria-label="직급"
            placeholder="직급"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={editStatusNote}
            onChange={(e) => setEditStatusNote(e.target.value)}
            aria-label="상태 표시"
            placeholder="상태 표시 (선택)"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={editPartnerId}
            onChange={(e) => setEditPartnerId(e.target.value)}
            aria-label="소속"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          >
            <option value="">소속 없음</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.companyName}
              </option>
            ))}
          </select>
          <input
            value={editWorkLocation}
            onChange={(e) => setEditWorkLocation(e.target.value)}
            aria-label="근무지"
            placeholder="근무지"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            aria-label="전화번호"
            placeholder="전화번호"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={editBirthdayMonth}
            onChange={(e) => setEditBirthdayMonth(e.target.value)}
            aria-label="생일 월"
            placeholder="월"
            inputMode="numeric"
            className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={editBirthdayDay}
            onChange={(e) => setEditBirthdayDay(e.target.value)}
            aria-label="생일 일"
            placeholder="일"
            inputMode="numeric"
            className="w-16 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <label className="flex items-center gap-1 text-xs text-muted">
            <input
              type="radio"
              name={`birthdayCalendar-${employee.id}`}
              checked={editBirthdayCalendar === "solar"}
              onChange={() => setEditBirthdayCalendar("solar")}
            />
            양력
          </label>
          <label className="flex items-center gap-1 text-xs text-muted">
            <input
              type="radio"
              name={`birthdayCalendar-${employee.id}`}
              checked={editBirthdayCalendar === "lunar"}
              onChange={() => setEditBirthdayCalendar("lunar")}
            />
            음력
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editName.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetEditFields();
              setIsEditing(false);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const birthdayText = formatBirthday(employee.birthdayMonth, employee.birthdayDay, employee.birthdayCalendar);
  const affiliationText = [employee.partnerName, employee.workLocation].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
      {dragHandleProps ? (
        <button
          type="button"
          aria-label={`${employee.name} 순서 변경`}
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical size={14} />
        </button>
      ) : null}

      <div className="min-w-[9rem] flex-1 basis-40 text-sm">
        <span className="font-semibold text-foreground">{employee.name}</span>
        {employee.position ? <span className="ml-1 text-muted">{employee.position}</span> : null}
        {employee.statusNote ? <span className="ml-1 text-xs text-muted">({employee.statusNote})</span> : null}
      </div>

      <div className="min-w-[8rem] flex-1 basis-40 truncate text-sm text-muted">{affiliationText || "-"}</div>

      <div className="min-w-[7rem] flex-1 basis-32 text-sm">
        {employee.phone ? (
          <a href={`tel:${employee.phone.replace(/[^0-9]/g, "")}`} className="text-accent hover:underline">
            {employee.phone}
          </a>
        ) : (
          <span className="text-muted">-</span>
        )}
      </div>

      <div className="min-w-[6rem] flex-1 basis-28 text-sm text-muted">{birthdayText ?? "-"}</div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          aria-label={`${employee.name} 수정`}
          className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-foreground"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`${employee.name} 삭제`}
          className="rounded-md p-1.5 text-danger hover:bg-bg disabled:opacity-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
