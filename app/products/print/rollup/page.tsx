import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { getCatalog, getCatalogRows, type CatalogRow } from "@/lib/products/productsStore";
import { PrintButton } from "@/components/products/PrintButton";
import { PrintRollupTable } from "@/components/products/PrintRollupTable";
import { CertStandards } from "@/components/products/CertStandards";

/** 인쇄용 제품 규격 총괄표. 가로(A4 landscape), 사이드바 없는 종이 형태. */
export default function ProductsRollupPrintPage() {
  let rows: CatalogRow[];
  try {
    rows = getCatalogRows();
  } catch (error) {
    console.error("[products/print/rollup] getCatalogRows 실패:", error);
    return (
      <div className="mx-auto max-w-[210mm] bg-white p-8 text-black">
        <p className="text-sm">제품 데이터를 불러오지 못했습니다.</p>
      </div>
    );
  }

  const generatedAt = getCatalog().generatedAt.slice(0, 10);

  return (
    <div className="min-h-screen bg-neutral-200 py-4 sm:py-6 print:bg-white print:py-0">
      {/* 이 인쇄 보기만 가로 방향 */}
      <style>{"@page { size: A4 landscape; margin: 12mm; }"}</style>

      <div className="mx-auto min-w-0 max-w-[297mm] overflow-x-auto bg-white p-4 text-black shadow sm:p-[12mm] print:max-w-none print:overflow-visible print:p-0 print:shadow-none">
        {/* 화면 전용 툴바 */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-black"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" /> 제품 정보로
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/products/print"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-black"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden="true" /> 제품별 데이터시트 인쇄
            </Link>
            <PrintButton />
          </div>
        </div>

        {/* 표지 */}
        <header className="mb-4 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">강산이엔지 제품 규격 총괄표</h1>
          <p className="mt-1 text-[11px] text-neutral-600">
            벽재 · 바닥재 · 천장재 · 제품 × 타입 {rows.length}행 · 생성일 {generatedAt} ·
            content/products/SCHEMA.md 기준
          </p>
        </header>

        <PrintRollupTable rows={rows} />

        <section className="mt-4 border-t border-neutral-400 pt-2 text-[9px] leading-relaxed text-neutral-600">
          <p>
            ● = 해당 시험성적서 보유 · ○ = 성적서 없음(해당없음 확정 아님) · 화재는 국내
            불연 / 준불연 / 방염만 표기 · 미끄럼저항 · 흡음·차음 등은 성적서 실측값 ·
            모든 값은 각 제품 <code className="font-mono">certifications</code> 에서 파생되어
            개별 페이지와 동기화됩니다.
          </p>
        </section>

        <section className="mt-4 break-before-page" style={{ pageBreakBefore: "always" }}>
          <h2 className="mb-2 break-after-avoid bg-black px-2 py-1 text-[12px] font-bold text-white">
            인증·성능 항목의 국내 건축자재 기준 (요약)
          </h2>
          <CertStandards variant="print" />
        </section>

        <footer className="mt-6 text-[10px] text-neutral-500 print:hidden">
          브라우저 인쇄(Ctrl/Cmd+P)에서 방향이 &ldquo;가로&rdquo;로 잡히는지 확인하세요.
        </footer>
      </div>
    </div>
  );
}
