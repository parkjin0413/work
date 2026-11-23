"use client";

import { useState } from "react";
import { ProductComparison, type ComparisonItem } from "./ProductComparison";

/**
 * 항목별 비교 위에 제품 고르기 칩. 처음에는 전 제품, 칩을 눌러 비교할 제품만 남긴다.
 * (제품이 2개 이하면 고를 게 없어 칩을 숨긴다)
 */
export function ComparisonPicker({ items }: { items: ComparisonItem[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const shown = items.filter((i) => !hidden.has(i.product.slug));

  function toggle(slug: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else if (items.length - next.size > 1) next.add(slug); // 하나는 남긴다
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {items.length > 2 ? (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="비교할 제품 고르기">
          <span className="mr-1 text-xs text-muted">비교할 제품</span>
          {items.map(({ product }) => {
            const on = !hidden.has(product.slug);
            return (
              <button
                key={product.slug}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(product.slug)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-muted line-through opacity-60 hover:opacity-100"
                }`}
              >
                {product.name}
              </button>
            );
          })}
          {hidden.size > 0 ? (
            <button type="button" onClick={() => setHidden(new Set())} className="ml-1 text-xs text-muted hover:text-foreground">
              전체 보기
            </button>
          ) : null}
        </div>
      ) : null}
      <ProductComparison items={shown} />
    </div>
  );
}
