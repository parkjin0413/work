"use client";

import { useRef, useState } from "react";
import { Check, Download } from "lucide-react";

type Props = {
  /** 파일에 담을 텍스트 (서버에서 만들어 내려준다) */
  text: string;
  /** 저장 파일명 (예: laminate-tile-hpl.md) */
  filename: string;
  label?: string;
  savedLabel?: string;
  className?: string;
};

/**
 * 텍스트를 .md 파일로 내려받는 버튼. 브라우저 Blob 다운로드라 서버 요청이 없다.
 * (Artifact 가 아니라 실제 앱이므로 a[download] 가 정상 동작)
 */
export function DownloadButton({
  text,
  filename,
  label = "MD 다운로드",
  savedLabel = "저장됨",
  className = "",
}: Props) {
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDownload() {
    try {
      const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      /* no-op — 다운로드 실패 시 조용히 무시 */
    }
    setSaved(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
        saved
          ? "border-accent bg-accent/10 text-accent"
          : "border-border text-foreground hover:bg-surface-hover"
      } ${className}`}
    >
      {saved ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {saved ? savedLabel : label}
    </button>
  );
}
