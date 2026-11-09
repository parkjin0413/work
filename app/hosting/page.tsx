export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listHostingSites } from "@/lib/hosting/hostingStore";
import { withRetry } from "@/lib/supabase/withRetry";
import { getKstTodayISO } from "@/lib/tasks/week";
import { HostingBoard } from "./HostingBoard";

export default async function HostingPage() {
  let sites;

  try {
    sites = await withRetry(() => listHostingSites(), "hosting");
  } catch (error) {
    console.error("[hosting] listHostingSites 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] py-6">
          <h1 className="text-lg font-semibold text-foreground">호스팅</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              호스팅 정보를 불러오지 못했습니다. Supabase 연결 상태와
              0012_hosting_sites.sql 마이그레이션 실행 여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] py-6">
        <h1 className="text-lg font-semibold text-foreground">호스팅</h1>
        <p className="mt-1 text-sm text-muted">
          홈페이지별 호스팅·도메인·SSL·계정 정보를 한곳에서 관리합니다. 항목을 클릭하면 복사됩니다.
        </p>

        <HostingBoard sites={sites} today={getKstTodayISO()} />
      </main>
    </div>
  );
}
