"use client";

import { useEffect, useState } from "react";
import { Download, FileText, X } from "lucide-react";

function isPdf(fileName: string | null): boolean {
  return !!fileName && fileName.toLowerCase().endsWith(".pdf");
}

export function PartnerFilePreview({
  fileUrl,
  downloadUrl,
  fileName,
  companyName,
  label = "사업자등록증",
}: {
  fileUrl: string;
  downloadUrl: string | null;
  fileName: string | null;
  companyName: string;
  /** 파일 종류 (사업자등록증 / 통장 사본) */
  label?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pdf = isPdf(fileName);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="shrink-0 overflow-hidden rounded-lg border border-border bg-bg"
        title="크게 보기"
      >
        {pdf ? (
          <span className="flex h-14 w-14 items-center justify-center text-muted">
            <FileText size={20} />
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl} alt={`${companyName} ${label}`} className="h-14 w-14 object-cover" />
        )}
      </button>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="truncate text-xs text-muted" title={fileName ?? undefined}>
          {fileName}
        </span>
        {downloadUrl ? (
          <a href={downloadUrl} className="flex items-center gap-1 text-xs text-accent hover:underline">
            <Download size={12} />
            다운로드
          </a>
        ) : null}
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${companyName} ${label} 보기`}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-surface p-3"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="닫기"
              className="absolute right-3 top-3 z-10 rounded-md bg-surface p-1.5 text-muted shadow hover:bg-bg hover:text-foreground"
            >
              <X size={18} />
            </button>

            {pdf ? (
              <iframe
                src={fileUrl}
                title={`${companyName} ${label}`}
                className="h-[80vh] w-full rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fileUrl}
                alt={`${companyName} ${label}`}
                className="mx-auto max-h-[80vh] w-auto rounded-lg"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
