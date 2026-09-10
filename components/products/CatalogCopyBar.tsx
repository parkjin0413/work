"use client";

import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";

/**
 * 랜딩 상단 — 전체 카탈로그를 한 번에 가져가는 경로.
 *  1) 전체 MD 다운로드 (product.md 원문 묶음 — Claude 디자인 등에 첨부용)
 *  2) catalog.json 복사 (클립보드)
 *  3) 고정 URL /products/catalog.json
 */
export function CatalogCopyBar({
  catalogJson,
  catalogMarkdown,
}: {
  catalogJson: string;
  catalogMarkdown: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm">
      <span className="text-muted">전체 카탈로그</span>
      <DownloadButton
        text={catalogMarkdown}
        filename="강산이엔지_제품정보_전체.md"
        label="전체 MD 다운로드"
      />
      <CopyButton text={catalogJson} label="catalog.json 복사" copiedLabel="복사됨" />
      <span className="text-muted">
        또는 <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-xs text-foreground">/products/catalog.json</code> 로 접근
      </span>
    </div>
  );
}
