import Link from "next/link";
import { HardDrive } from "lucide-react";
import type { DriveSummary } from "@/lib/dashboard/homeSummary";

export function DriveSummaryCard({ summary }: { summary: DriveSummary }) {
  return (
    <Link
      href="/drive"
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <HardDrive className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">Google Drive</h2>
      </div>
      {summary.state === "not_connected" ? (
        <p className="mt-3 text-sm text-muted">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-3 text-sm text-muted">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.names.length === 0 ? (
        <p className="mt-3 text-sm text-muted">파일이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.names.map((name, index) => (
            <li key={index} className="truncate text-sm text-foreground">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
