export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listPartners } from "@/lib/partners/partnersStore";
import { PartnersBoard } from "./PartnersBoard";

export default async function PartnersPage() {
  let partners;

  try {
    partners = await listPartners();
  } catch (error) {
    console.error("[partners] listPartners 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">회사 정보</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              거래처 정보를 불러오지 못했습니다. Supabase 연결 상태와
              0008_partners.sql 마이그레이션 실행 여부를 확인해주세요.
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
        <h1 className="text-lg font-semibold text-foreground">회사 정보</h1>
        <p className="mt-1 text-sm text-muted">
          항목을 클릭하면 클립보드에 복사됩니다. 사업자번호·전화번호는 하이픈 없이 숫자만 복사돼요.
        </p>

        <PartnersBoard partners={partners} />
      </main>
    </div>
  );
}
