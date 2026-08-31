import Link from "next/link";
import { NotebookText } from "lucide-react";
import type { NotionSummary } from "@/lib/dashboard/homeSummary";

export function NotionSummaryCard({ summary }: { summary: NotionSummary }) {
  return (
    <Link
      href="/notion"
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <NotebookText className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">Notion</h2>
      </div>
      {summary.state === "not_configured" ? (
        <p className="mt-3 text-sm text-muted">Notion 연동이 설정되지 않았습니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-3 text-sm text-muted">NOTION_API_KEY 값을 확인해주세요.</p>
      ) : summary.state === "empty" ? (
        <p className="mt-3 text-sm text-muted">공유된 데이터베이스가 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.titles.map((title, index) => (
            <li key={index} className="truncate text-sm text-foreground">
              {title}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
