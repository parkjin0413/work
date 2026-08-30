import { AppHeader } from "@/components/layout/AppHeader";
import { ServiceSummaryCard } from "@/components/dashboard/ServiceSummaryCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <ServiceSummaryCard
          title="Gmail"
          description="최근 메일을 확인하고 보낼 수 있습니다."
          href="/gmail"
        />
        <ServiceSummaryCard
          title="Google Drive"
          description="파일을 조회하고 업로드/관리할 수 있습니다."
          href="/drive"
        />
        <ServiceSummaryCard
          title="Notion"
          description="데이터베이스 항목을 확인하고 추가/수정할 수 있습니다."
          href="/notion"
        />
      </div>
    </main>
  );
}
