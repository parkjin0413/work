"use client";

import { CopyButton } from "./CopyButton";

/**
 * 랜딩 상단 — 전체 카탈로그를 한 번에 가져가는 두 경로 안내.
 *  1) catalog.json 복사 (클립보드)
 *  2) 고정 URL /products/catalog.json
 */
export function CatalogCopyBar({ catalogJson }: { catalogJson: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <span className="text-muted">전체 카탈로그</span>
      <CopyButton text={catalogJson} label="catalog.json 복사" copiedLabel="복사됨" />
      <span className="text-muted">
        또는 <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-foreground">/products/catalog.json</code> 로 접근
      </span>
    </div>
  );
}
