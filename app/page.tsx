export const dynamic = "force-dynamic";

import { AppHeader } from "@/components/layout/AppHeader";
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
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <GmailSummaryCard summary={gmailSummary} />
        <DriveSummaryCard summary={driveSummary} />
        <NotionSummaryCard summary={notionSummary} />
      </div>
    </main>
  );
}
