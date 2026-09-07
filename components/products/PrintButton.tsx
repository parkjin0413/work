"use client";

import { Printer } from "lucide-react";

/** 브라우저 인쇄 대화상자를 여는 버튼. 인쇄 결과물에는 표시되지 않는다. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 print:hidden"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden="true" />
      인쇄 / PDF 저장
    </button>
  );
}
