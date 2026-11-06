export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { withRetry } from "@/lib/supabase/withRetry";
import { listPartners } from "@/lib/partners/partnersStore";
import { listDepartmentsWithEmployees } from "@/lib/employees/employeesStore";
import { listVehicles } from "@/lib/vehicles/vehiclesStore";
import { PartnersBoard } from "@/app/partners/PartnersBoard";
import { EmployeesBoard } from "@/app/employees/EmployeesBoard";
import { VehiclesCard } from "./VehiclesCard";

export default async function CompanyPage() {
  let partners;
  let departments;
  let vehicles;

  try {
    [partners, departments, vehicles] = await Promise.all([
      withRetry(() => listPartners(), "company/partners"),
      withRetry(() => listDepartmentsWithEmployees(), "company/employees"),
      withRetry(() => listVehicles(), "company/vehicles"),
    ]);
  } catch (error) {
    console.error("[company] 조회 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">회사 · 직원</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              회사·직원 정보를 불러오지 못했습니다. Supabase 연결 상태와 0019_company_vehicles.sql 마이그레이션 실행
              여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-4 sm:p-6">
        <h1 className="text-lg font-semibold text-foreground">회사 · 직원</h1>

        <section aria-label="회사" className="mt-5">
          <PartnersBoard partners={partners} trailing={<VehiclesCard vehicles={vehicles} />} />
        </section>

        <section aria-label="직원명단" className="mt-10">
          <h2 className="text-base font-semibold text-foreground">직원명단</h2>
          <EmployeesBoard departments={departments} partners={partners} />
        </section>
      </main>
    </div>
  );
}
