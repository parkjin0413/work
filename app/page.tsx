import { AppHeader } from "@/components/layout/AppHeader";
import { ServiceSummaryCard } from "@/components/dashboard/ServiceSummaryCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <ServiceSummaryCard title="Gmail" description="Gmail 연동 준비 중입니다." />
        <ServiceSummaryCard title="Google Drive" description="Drive 연동 준비 중입니다." />
        <ServiceSummaryCard title="Notion" description="Notion 연동 준비 중입니다." />
      </div>
    </main>
  );
}
