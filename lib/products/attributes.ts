/**
 * 제품 성능 속성 집계 헬퍼 — 한 제품의 여러 타입에 흩어진 attributes 를
 * 하나로 합쳐 배지/요약에 쓴다.
 */

import type { CategoryLabel } from "./categories";
import { attrsForCategory, type AttrDef } from "./attributeSchema";
import type { ProductAttributeValue, ProductType } from "./productsStore";

export function isPresent(v: ProductAttributeValue | undefined): boolean {
  return v !== null && v !== undefined && v !== false && v !== "";
}

/**
 * 같은 제품 안 타입들의 attributes 를 합친다.
 *  - flag: 하나라도 present 면 true
 *  - text: 첫 present 값(문자열) 채택
 */
export function aggregateAttributes(
  category: CategoryLabel,
  types: ProductType[]
): Record<string, ProductAttributeValue> {
  const defs = attrsForCategory(category);
  const out: Record<string, ProductAttributeValue> = {};
  for (const d of defs) out[d.key] = d.format === "text" ? null : false;

  for (const t of types) {
    for (const d of defs) {
      const v = t.attributes[d.key];
      if (!isPresent(v)) continue;
      if (d.format === "text") {
        if (!isPresent(out[d.key])) out[d.key] = v as string;
      } else {
        out[d.key] = true;
      }
    }
  }
  return out;
}

/** 값이 있는 속성의 라벨 목록 (text 는 "라벨 값" 형태). 배지·칩용. */
export function presentBadgeLabels(
  category: CategoryLabel,
  types: ProductType[]
): string[] {
  const agg = aggregateAttributes(category, types);
  const defs = attrsForCategory(category);
  const labels: string[] = [];
  for (const d of defs) {
    const v = agg[d.key];
    if (!isPresent(v)) continue;
    labels.push(d.format === "text" && typeof v === "string" ? `${d.label} ${v}` : d.label);
  }
  return labels;
}

export type { AttrDef };
