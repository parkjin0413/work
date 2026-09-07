import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  getAllProducts,
  getCatalog,
  getCatalogRows,
  type Product,
} from "@/lib/products/productsStore";
import {
  CATEGORY_ORDER,
  slugToLabel,
} from "@/lib/products/categories";
import { presentBadgeLabels } from "@/lib/products/attributes";
import { RollupTable } from "@/components/products/RollupTable";
import { CatalogCopyBar } from "@/components/products/CatalogCopyBar";
import { ProductSearch, type ProductListItem } from "@/components/products/ProductSearch";

function toListItem(p: Product): ProductListItem {
  return {
    slug: p.slug,
    categorySlug: p.categorySlug,
    category: p.category,
    name: p.name,
    productType: p.productType,
    material: p.material,
    summary: p.summary,
    certLabels: p.certifications.map((c) => c.label),
    typeCount: p.types.length,
    badges: presentBadgeLabels(p.category, p.types).slice(0, 4),
    discontinued: p.status === "discontinued",
  };
}

export default function ProductsPage() {
  let products: Product[];
  try {
    products = getAllProducts();
  } catch (error) {
    console.error("[products] getAllProducts 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">제품 정보</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              제품 데이터를 불러오지 못했습니다. content/products/ 파일 구조와
              frontmatter 형식을 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  const rows = getCatalogRows();
  const catalogJson = JSON.stringify(getCatalog(), null, 2);
  const countByCategory = new Map(
    CATEGORY_ORDER.map(slugToLabel).map((label) => [
      label,
      products.filter((p) => p.category === label).length,
    ])
  );

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 space-y-8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-foreground">제품 정보</h1>
            <p className="mt-1 text-sm text-muted">
              벽재 / 바닥재 / 천장재를 같은 양식으로 정리한 참고 카탈로그입니다.
              편집은 <code className="font-mono text-xs">content/products/</code> 파일에서 합니다.
            </p>
          </div>
          <Link
            href="/products/print"
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover"
          >
            인쇄용 보기
          </Link>
        </div>

        <CatalogCopyBar catalogJson={catalogJson} />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">분류</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {CATEGORY_ORDER.map((slug) => {
              const label = slugToLabel(slug);
              const count = countByCategory.get(label) ?? 0;
              return (
                <Link
                  key={slug}
                  href={`/products/${slug}`}
                  className="rounded-xl border border-border bg-surface p-4 hover:border-accent"
                >
                  <p className="text-sm font-semibold text-foreground">{label}</p>
                  <p className="mt-1 text-xs text-muted">{count}종 등록</p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">제품 규격 총괄표</h2>
          <RollupTable rows={rows} />
          <p className="text-[11px] leading-relaxed text-muted">
            채운 점 = 원본 자료에 명시됨 · 빈 점 = 정보 없음(해당없음 확정 아님) ·
            화재는 국내 불연/준불연 기준만 표시 · 모든 값은 각 제품 원문에 명시된
            내용만 반영합니다.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">제품 찾기</h2>
          <ProductSearch products={products.map(toListItem)} />
        </section>
      </main>
    </div>
  );
}
