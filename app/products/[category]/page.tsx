import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  CATEGORY_ORDER,
  isCategorySlug,
  slugToLabel,
} from "@/lib/products/categories";
import {
  getCatalogRows,
  getProductsByCategory,
  getRawMarkdown,
  type Product,
} from "@/lib/products/productsStore";
import { buildClaudeBlock, buildJson, buildPlainText } from "@/lib/products/copyText";
import { RollupTable } from "@/components/products/RollupTable";
import { DownloadButton } from "@/components/products/DownloadButton";
import {
  ProductComparison,
  type ComparisonItem,
} from "@/components/products/ProductComparison";

export function generateStaticParams() {
  return CATEGORY_ORDER.map((category) => ({ category }));
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 space-y-6 p-6">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden="true" /> 제품 정보
        </Link>
        {children}
      </main>
    </div>
  );
}

function toItem(category: string, p: Product): ComparisonItem {
  return {
    product: p,
    copy: {
      plain: buildPlainText(p),
      markdown: getRawMarkdown(category, p.slug) ?? "",
      json: buildJson(p),
      claude: buildClaudeBlock(p),
    },
  };
}

export default function CategoryPage({ params }: { params: { category: string } }) {
  if (!isCategorySlug(params.category)) {
    notFound();
  }

  const label = slugToLabel(params.category);

  let products: Product[];
  try {
    products = getProductsByCategory(label);
  } catch (error) {
    console.error("[products] getProductsByCategory 실패:", error);
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-foreground">{label}</h1>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">
            제품 데이터를 불러오지 못했습니다. content/products/{params.category}/ 파일
            구조를 확인해주세요.
          </p>
        </div>
      </Shell>
    );
  }

  const rows = getCatalogRows().filter((r) => r.category === label);

  // 이 분류 전 제품의 product.md 원문을 한 파일로 (AI 참고용).
  const bundle =
    `<!-- 강산이엔지 ${label} 제품 정보 · content/products/${params.category} · ${products.length}종 -->\n\n` +
    products
      .map((p) => getRawMarkdown(params.category, p.slug) ?? "")
      .filter(Boolean)
      .join("\n\n---\n\n");

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">{label}</h1>
          <p className="mt-1 text-sm text-muted">{products.length}종 등록 · 전 제품 한 화면 비교</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {products.length > 0 ? (
            <DownloadButton
              text={bundle}
              filename={`강산이엔지_${label}_제품정보.md`}
              label={`${label} 전체 MD 다운로드`}
            />
          ) : null}
          <Link
            href="/products/print"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
          >
            인쇄용 보기
          </Link>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted">
          등록된 제품이 없습니다.
        </p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">규격 총괄표</h2>
            <RollupTable rows={rows} categories={[label]} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground">항목별 비교</h2>
            <ProductComparison items={products.map((p) => toItem(params.category, p))} />
          </section>
        </>
      )}
    </Shell>
  );
}
