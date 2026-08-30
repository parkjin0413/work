import Link from "next/link";
import type { NotionSummary } from "@/lib/dashboard/homeSummary";

export function NotionSummaryCard({ summary }: { summary: NotionSummary }) {
  return (
    <Link
      href="/notion"
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">Notion</h2>
      {summary.state === "not_configured" ? (
        <p className="mt-2 text-sm text-neutral-400">Notion 연동이 설정되지 않았습니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-2 text-sm text-neutral-400">NOTION_API_KEY 값을 확인해주세요.</p>
      ) : summary.state === "empty" ? (
        <p className="mt-2 text-sm text-neutral-400">공유된 데이터베이스가 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summary.titles.map((title, index) => (
            <li key={index} className="truncate text-sm text-neutral-300">
              {title}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
