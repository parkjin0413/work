"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  CATEGORY_ORDER,
  slugToLabel,
  type CategoryLabel,
} from "@/lib/products/categories";

export type ProductListItem = {
  slug: string;
  categorySlug: string;
  category: CategoryLabel;
  name: string;
  productType: string;
  material: string;
  summary: string;
  certLabels: string[];
  typeCount: number;
  badges: string[];
  discontinued: boolean;
};

const ALL = "전체" as const;

export function ProductSearch({ products }: { products: ProductListItem[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryLabel | typeof ALL>(ALL);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== ALL && p.category !== category) return false;
      if (!q) return true;
      const haystack = [
        p.name,
        p.productType,
        p.material,
        p.summary,
        ...p.certLabels,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [products, query, category]);

  const chips: (CategoryLabel | typeof ALL)[] = [ALL, ...CATEGORY_ORDER.map(slugToLabel)];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제품명 · 형태 · 소재 · 인증명 검색"
          aria-label="제품 검색"
          className="w-full min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent sm:w-auto sm:min-w-[200px]"
        />
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                category === c
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-muted hover:bg-surface-hover"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
          조건에 맞는 제품이 없습니다.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <li key={`${p.categorySlug}/${p.slug}`}>
              <Link
                href={`/products/${p.categorySlug}#${p.slug}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-border bg-surface p-4 hover:border-accent"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-hover px-1.5 py-0.5 text-[11px] font-medium text-muted">
                    {p.category}
                  </span>
                  {p.discontinued ? (
                    <span className="rounded bg-danger-bg px-1.5 py-0.5 text-[11px] font-medium text-danger">
                      단종
                    </span>
                  ) : null}
                  <span className="text-[11px] text-muted">타입 {p.typeCount}개</span>
                </div>
                <h3 className="text-sm font-semibold text-foreground">{p.name}</h3>
                <p className="text-xs text-muted">{p.productType}</p>
                {p.badges.length > 0 ? (
                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    {p.badges.map((b) => (
                      <span
                        key={b}
                        className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="mt-auto inline-flex items-center gap-1 pt-1 text-xs font-medium text-accent">
                  자세히 <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
