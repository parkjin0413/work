export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { GmailSummaryCard } from "@/components/dashboard/GmailSummaryCard";
import { DriveSummaryCard } from "@/components/dashboard/DriveSummaryCard";
import { NotionSummaryCard } from "@/components/dashboard/NotionSummaryCard";
import { getGmailSummary, getDriveSummary, getNotionSummary } from "@/lib/dashboard/homeSummary";

export default async function HomePage() {
  const [gmailSummary, driveSummary, notionSummary] = await Promise.all([
    getGmailSummary(),
    getDriveSummary(),
    getNotionSummary(),
  ]);

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <section aria-label="서비스 요약" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GmailSummaryCard summary={gmailSummary} />
          <DriveSummaryCard summary={driveSummary} />
          <NotionSummaryCard summary={notionSummary} />
        </section>
      </main>
    </div>
  );
}
