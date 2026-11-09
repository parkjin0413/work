"use client";

import Link from "next/link";
import { useTransition } from "react";

/** 문서 화면 위 버튼 줄: 목록 / 수정 / 삭제 / 인쇄. 인쇄할 때는 숨긴다. */
export function DocumentToolbar({
  editHref,
  onDelete,
  label,
}: {
  editHref: string;
  onDelete: () => Promise<void>;
  /** 삭제 확인 문구에 쓰는 문서 이름 (예: "품의서 홍보부-2026-01") */
  label: string;
}) {
  const [isDeleting, startDelete] = useTransition();

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
      <Link href="/forms" className="text-sm text-muted hover:text-foreground">
        ← 목록으로
      </Link>
      <div className="flex gap-2">
        <Link
          href={editHref}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          수정
        </Link>
        <button
          type="button"
          disabled={isDeleting}
          onClick={() => {
            if (!window.confirm(`${label}을(를) 삭제할까요? 되돌릴 수 없습니다.`)) return;
            startDelete(() => onDelete());
          }}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-danger hover:bg-danger-bg disabled:opacity-60"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover"
        >
          인쇄하기
        </button>
      </div>
    </div>
  );
}
