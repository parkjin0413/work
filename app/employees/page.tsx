export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listDepartmentsWithEmployees } from "@/lib/employees/employeesStore";
import { listPartners } from "@/lib/partners/partnersStore";
import { EmployeesBoard } from "./EmployeesBoard";

export default async function EmployeesPage() {
  let departments;
  let partners;

  try {
    [departments, partners] = await Promise.all([listDepartmentsWithEmployees(), listPartners()]);
  } catch (error) {
    console.error("[employees] 조회 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">직원명단</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              직원 정보를 불러오지 못했습니다. Supabase 연결 상태와
              0009_employees.sql 마이그레이션 실행 여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">직원명단</h1>
        <p className="mt-1 text-sm text-muted">
          부서·직급·연락처로 동료를 빠르게 찾아보세요. 전화번호를 누르면 바로 전화가 걸려요.
        </p>

        <EmployeesBoard departments={departments} partners={partners} />
      </main>
    </div>
  );
}
