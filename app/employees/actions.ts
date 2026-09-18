"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createDepartment,
  renameDepartment,
  deleteDepartment,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  reorderEmployees,
  type BirthdayCalendar,
} from "@/lib/employees/employeesStore";

function normalize(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeDay(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : null;
}

function normalizeCalendar(value: string): BirthdayCalendar | null {
  return value === "solar" || value === "lunar" ? value : null;
}

export async function createDepartmentAction(name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("부서 이름을 입력해주세요.");
  }

  await createDepartment(name.trim());
  revalidatePath("/employees");
}

export async function renameDepartmentAction(id: string, name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("부서 이름을 입력해주세요.");
  }

  await renameDepartment(id, name.trim());
  revalidatePath("/employees");
}

export async function deleteDepartmentAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteDepartment(id);
  revalidatePath("/employees");
}

export async function createEmployeeAction(params: {
  departmentId: string;
  name: string;
  position: string;
  statusNote: string;
  partnerId: string;
  workLocation: string;
  phone: string;
  birthdayMonth: string;
  birthdayDay: string;
  birthdayCalendar: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.departmentId) {
    throw new Error("부서를 선택해주세요.");
  }
  if (!params.name.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await createEmployee({
    departmentId: params.departmentId,
    name: params.name.trim(),
    position: normalize(params.position),
    statusNote: normalize(params.statusNote),
    partnerId: params.partnerId || null,
    workLocation: normalize(params.workLocation),
    phone: normalize(params.phone),
    birthdayMonth: normalizeDay(params.birthdayMonth),
    birthdayDay: normalizeDay(params.birthdayDay),
    birthdayCalendar: normalizeCalendar(params.birthdayCalendar),
  });
  revalidatePath("/employees");
}

export async function updateEmployeeAction(params: {
  id: string;
  departmentId: string;
  name: string;
  position: string;
  statusNote: string;
  partnerId: string;
  workLocation: string;
  phone: string;
  birthdayMonth: string;
  birthdayDay: string;
  birthdayCalendar: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.departmentId) {
    throw new Error("부서를 선택해주세요.");
  }
  if (!params.name.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await updateEmployee(params.id, {
    departmentId: params.departmentId,
    name: params.name.trim(),
    position: normalize(params.position),
    statusNote: normalize(params.statusNote),
    partnerId: params.partnerId || null,
    workLocation: normalize(params.workLocation),
    phone: normalize(params.phone),
    birthdayMonth: normalizeDay(params.birthdayMonth),
    birthdayDay: normalizeDay(params.birthdayDay),
    birthdayCalendar: normalizeCalendar(params.birthdayCalendar),
  });
  revalidatePath("/employees");
}

export async function deleteEmployeeAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteEmployee(id);
  revalidatePath("/employees");
}

export async function reorderEmployeesAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  await reorderEmployees(orderedIds);
  revalidatePath("/employees");
}
