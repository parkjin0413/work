import Link from "next/link";
import type { DriveSummary } from "@/lib/dashboard/homeSummary";

export function DriveSummaryCard({ summary }: { summary: DriveSummary }) {
  return (
    <Link
      href="/drive"
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">Google Drive</h2>
      {summary.state === "not_connected" ? (
        <p className="mt-2 text-sm text-neutral-400">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-2 text-sm text-neutral-400">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.names.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">파일이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summary.names.map((name, index) => (
            <li key={index} className="truncate text-sm text-neutral-300">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
