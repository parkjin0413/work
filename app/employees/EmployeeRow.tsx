"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Building2, Cake, Car, GripVertical, Pencil, Phone, Trash2, type LucideIcon } from "lucide-react";
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
  const [editCarNumber, setEditCarNumber] = useState(employee.carNumber ?? "");
  const [carCopied, setCarCopied] = useState(false);
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
    setEditCarNumber(employee.carNumber ?? "");
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
        carNumber: editCarNumber,
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
      <div data-employee-editing className="flex flex-col gap-2 rounded-xl border border-accent bg-surface p-3">
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
          <input
            value={editCarNumber}
            onChange={(e) => setEditCarNumber(e.target.value)}
            aria-label="차량번호"
            placeholder="차량번호"
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

  // 모든 카드가 같은 줄 구성(이름 / 전화 / 소속 / 생일 / 차량)을 갖도록, 값이 없어도 줄 자리는 남기고 "-"로 채운다.
  // 드래그 손잡이와 수정·삭제는 PC에서 마우스를 올릴 때만 보이고, 손잡이는 왼쪽 여백 위에 떠 있어서 글자 시작점을 밀지 않는다.
  return (
    <div className="group relative flex h-full flex-col gap-1 rounded-xl border border-border bg-surface py-2.5 pl-6 pr-2">
      {dragHandleProps ? (
        <button
          type="button"
          aria-label={`${employee.name} 순서 변경`}
          title="끌어서 순서 변경"
          className="absolute left-1 top-3 cursor-grab touch-none rounded p-0.5 text-muted opacity-40 hover:bg-bg hover:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-60"
          {...dragHandleProps.attributes}
          {...dragHandleProps.listeners}
        >
          <GripVertical size={14} />
        </button>
      ) : null}

      <div className="flex items-center gap-1">
        <div className="min-w-0 flex-1 truncate leading-7">
          <span className="text-lg font-semibold text-foreground">{employee.name}</span>
          {employee.position ? <span className="ml-1.5 text-sm text-muted">{employee.position}</span> : null}
          {employee.statusNote ? <span className="ml-1 text-sm text-muted">({employee.statusNote})</span> : null}
        </div>
        <div className="flex shrink-0 items-center sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${employee.name} 수정`}
            title="수정"
            className="rounded-md p-1 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`${employee.name} 삭제`}
            title="삭제"
            className="rounded-md p-1 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <InfoLine icon={Phone} label="전화번호">
        {employee.phone ? (
          <a href={`tel:${employee.phone.replace(/[^0-9]/g, "")}`} className="font-medium text-accent hover:underline">
            {employee.phone}
          </a>
        ) : null}
      </InfoLine>
      <InfoLine icon={Building2} label="소속">
        {affiliationText ? <span className="text-foreground">{affiliationText}</span> : null}
      </InfoLine>
      <InfoLine icon={Cake} label="생일">
        {birthdayText ? <span className="text-foreground">{birthdayText}</span> : null}
      </InfoLine>
      <InfoLine icon={Car} label="차량번호">
        {employee.carNumber ? (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(employee.carNumber ?? "");
                setCarCopied(true);
                setTimeout(() => setCarCopied(false), 1500);
              } catch {
                /* 복사 실패는 무시 */
              }
            }}
            title="차량번호 복사"
            className="text-left text-foreground hover:text-accent hover:underline"
          >
            {carCopied ? <span className="text-accent">복사됨</span> : employee.carNumber}
          </button>
        ) : null}
      </InfoLine>

      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

/** 정보 한 줄: 같은 크기 아이콘 + 값. 값이 없으면 흐린 "-" 로 자리만 지킨다. */
function InfoLine({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  const empty = children === null || children === undefined || children === false;
  return (
    <div className="flex min-w-0 items-start gap-1.5 text-[15px] leading-6">
      <Icon size={15} aria-label={label} className="mt-[5px] shrink-0 text-muted opacity-70" />
      <div className="min-w-0 break-keep">{empty ? <span className="text-muted opacity-50">-</span> : children}</div>
    </div>
  );
}
