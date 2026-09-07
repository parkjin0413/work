import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getAllProducts,
  getCatalog,
  type Product,
} from "@/lib/products/productsStore";
import { slugToLabel } from "@/lib/products/categories";
import { PrintButton } from "@/components/products/PrintButton";
import { PrintDatasheet } from "@/components/products/PrintDatasheet";

/** 인쇄용 전 제품 데이터시트. 사이드바 없는 종이 형태, 제품마다 페이지 나눔. */
export default function ProductsPrintPage() {
  let products: Product[];
  try {
    products = getAllProducts();
  } catch (error) {
    console.error("[products/print] getAllProducts 실패:", error);
    return (
      <div className="mx-auto max-w-[210mm] bg-white p-8 text-black">
        <p className="text-sm">제품 데이터를 불러오지 못했습니다.</p>
      </div>
    );
  }

  const generatedAt = getCatalog().generatedAt.slice(0, 10);

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      <div className="mx-auto max-w-[210mm] bg-white p-[14mm] text-black shadow print:max-w-none print:p-0 print:shadow-none">
        {/* 화면 전용 툴바 */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-black"
          >
            <ArrowLeft className="h-3 w-3" aria-hidden="true" /> 제품 정보로
          </Link>
          <PrintButton />
        </div>

        {/* 표지 */}
        <header className="mb-6 border-b-2 border-black pb-3">
          <h1 className="text-xl font-bold">강산이엔지 제품 데이터시트</h1>
          <p className="mt-1 text-[11px] text-neutral-600">
            벽재 · 바닥재 · 천장재 전 제품 {products.length}종 · 생성일 {generatedAt} ·
            content/products/SCHEMA.md 기준
          </p>
        </header>

        {products.map((p, idx) => {
          const label = slugToLabel(p.categorySlug);
          const isCategoryFirst = idx === 0 || products[idx - 1].category !== p.category;
          const categoryCount = products.filter((x) => x.category === p.category).length;
          return (
            <section
              key={`${p.categorySlug}/${p.slug}`}
              // 제품마다 새 페이지에서 시작 (첫 제품 제외). 최신 스펙 + 레거시 속성 병기.
              className={idx === 0 ? "" : "break-before-page"}
              style={idx === 0 ? undefined : { pageBreakBefore: "always" }}
            >
              {isCategoryFirst ? (
                <h2 className="mb-2 break-after-avoid bg-black px-2 py-1 text-[12px] font-bold text-white">
                  {label} ({categoryCount}종)
                </h2>
              ) : null}
              <PrintDatasheet product={p} />
            </section>
          );
        })}

        <footer className="mt-8 border-t border-neutral-400 pt-2 text-[10px] text-neutral-500 print:hidden">
          브라우저 인쇄(Ctrl/Cmd+P)에서 &ldquo;배경 그래픽&rdquo;을 켜면 제목 배경이 함께 인쇄됩니다.
        </footer>
      </div>
    </div>
  );
}
