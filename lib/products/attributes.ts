/**
 * 총괄표 성능값은 손으로 넣지 않고 제품의 `certifications` 에서 파생한다.
 * 각 인증의 `feeds`(성능 컬럼 key) + `result` + `scope` 로 계산 →
 * 개별 페이지 인증과 총괄표가 항상 동기화된다.
 */

import type { CategoryLabel } from "./categories";
import { attrsForCategory, type AttrDef } from "./attributeSchema";
import type { Certification, ProductAttributeValue, Product } from "./productsStore";

export function isPresent(v: ProductAttributeValue | undefined): boolean {
  return v !== null && v !== undefined && v !== false && v !== "";
}

/**
 * 제품의 인증 목록에서 총괄표 성능 컬럼값을 파생한다.
 *  - flag 컬럼: feeds 가 그 key 인 인증이 하나라도 있으면 true
 *  - text 컬럼(fire/slip/abrasion/nrc 등): 첫 인증의 result 값
 *  - fire: scope 가 "국내" 인 인증만 반영 (해외 등급은 인증 표에만)
 */
export function deriveAttributes(
  category: CategoryLabel,
  certifications: Certification[]
): Record<string, ProductAttributeValue> {
  const defs = attrsForCategory(category);
  const out: Record<string, ProductAttributeValue> = {};
  for (const d of defs) out[d.key] = d.format === "text" ? null : false;

  const byKey = new Map(defs.map((d) => [d.key, d]));

  for (const cert of certifications) {
    const key = cert.feeds;
    const def = key ? byKey.get(key) : undefined;
    if (!def) continue;

    if (key === "fire") {
      if (cert.scope === "국내" && cert.result && !isPresent(out.fire)) {
        out.fire = cert.result;
      }
      continue;
    }
    if (def.format === "text") {
      if (cert.result && !isPresent(out[key])) out[key] = cert.result;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** 편의: Product 를 그대로 받아 파생. */
export function productAttributes(product: Product): Record<string, ProductAttributeValue> {
  return deriveAttributes(product.category, product.certifications);
}

/** 값이 있는 성능 속성의 라벨 목록 (text 는 "라벨 값"). 배지·칩용. */
export function presentBadgeLabels(product: Product): string[] {
  const agg = productAttributes(product);
  const defs = attrsForCategory(product.category);
  const labels: string[] = [];
  for (const d of defs) {
    const v = agg[d.key];
    if (!isPresent(v)) continue;
    labels.push(d.format === "text" && typeof v === "string" ? `${d.label} ${v}` : d.label);
  }
  return labels;
}

export type { AttrDef };
