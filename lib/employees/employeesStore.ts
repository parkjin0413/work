import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

export type BirthdayCalendar = "solar" | "lunar";

export type EmployeeSummary = {
  id: string;
  name: string;
  position: string | null;
  statusNote: string | null;
  partnerId: string | null;
  partnerName: string | null;
  workLocation: string | null;
  phone: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayCalendar: BirthdayCalendar | null;
};

export type DepartmentWithEmployees = {
  id: string;
  name: string;
  employees: EmployeeSummary[];
};

type EmployeeInput = {
  departmentId: string;
  name: string;
  position: string | null;
  statusNote: string | null;
  partnerId: string | null;
  workLocation: string | null;
  phone: string | null;
  birthdayMonth: number | null;
  birthdayDay: number | null;
  birthdayCalendar: BirthdayCalendar | null;
};

export async function listDepartmentsWithEmployees(): Promise<DepartmentWithEmployees[]> {
  const supabase = createSupabaseServiceClient();

  const { data: departments, error: departmentsError } = await supabase
    .from("employee_departments")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (departmentsError) {
    throw new Error(`부서 조회 실패: ${departmentsError.message}`);
  }

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select(
      "id, department_id, name, position, status_note, partner_id, work_location, phone, birthday_month, birthday_day, birthday_calendar"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (employeesError) {
    throw new Error(`직원 조회 실패: ${employeesError.message}`);
  }

  const partnerIds = Array.from(
    new Set((employees ?? []).map((employee) => employee.partner_id).filter((id): id is string => !!id))
  );

  const partnerNameById = new Map<string, string>();
  if (partnerIds.length > 0) {
    const { data: partners, error: partnersError } = await supabase
      .from("partners")
      .select("id, company_name")
      .in("id", partnerIds);

    if (partnersError) {
      throw new Error(`소속 회사 조회 실패: ${partnersError.message}`);
    }

    for (const partner of partners ?? []) {
      partnerNameById.set(partner.id, partner.company_name);
    }
  }

  return (departments ?? []).map((department) => ({
    id: department.id,
    name: department.name,
    employees: (employees ?? [])
      .filter((employee) => employee.department_id === department.id)
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        position: employee.position,
        statusNote: employee.status_note,
        partnerId: employee.partner_id,
        partnerName: employee.partner_id ? partnerNameById.get(employee.partner_id) ?? null : null,
        workLocation: employee.work_location,
        phone: employee.phone,
        birthdayMonth: employee.birthday_month,
        birthdayDay: employee.birthday_day,
        birthdayCalendar: employee.birthday_calendar as BirthdayCalendar | null,
      })),
  }));
}

export async function createDepartment(name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("employee_departments").insert({ name });

  if (error) {
    throw new Error(`부서 생성 실패: ${error.message}`);
  }
}

export async function renameDepartment(id: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("employee_departments").update({ name }).eq("id", id);

  if (error) {
    throw new Error(`부서 이름 변경 실패: ${error.message}`);
  }
}

export async function deleteDepartment(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("employee_departments").delete().eq("id", id);

  if (error) {
    throw new Error(`부서 삭제 실패: ${error.message}`);
  }
}

export async function createEmployee(input: EmployeeInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("employees").insert({
    department_id: input.departmentId,
    name: input.name,
    position: input.position,
    status_note: input.statusNote,
    partner_id: input.partnerId,
    work_location: input.workLocation,
    phone: input.phone,
    birthday_month: input.birthdayMonth,
    birthday_day: input.birthdayDay,
    birthday_calendar: input.birthdayCalendar,
  });

  if (error) {
    throw new Error(`직원 등록 실패: ${error.message}`);
  }
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("employees")
    .update({
      department_id: input.departmentId,
      name: input.name,
      position: input.position,
      status_note: input.statusNote,
      partner_id: input.partnerId,
      work_location: input.workLocation,
      phone: input.phone,
      birthday_month: input.birthdayMonth,
      birthday_day: input.birthdayDay,
      birthday_calendar: input.birthdayCalendar,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`직원 수정 실패: ${error.message}`);
  }
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("employees").delete().eq("id", id);

  if (error) {
    throw new Error(`직원 삭제 실패: ${error.message}`);
  }
}

export async function reorderEmployees(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("employees").update({ sort_order: index }).eq("id", id))
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`직원 순서 변경 실패: ${failed.error.message}`);
  }
}
