/**
 * 성능 속성(types[].attributes) 렌더 설정 — 단일 소스.
 *
 * 코어 4개는 전 분류 공통이며 총괄표 고정 컬럼. 분류별 확장은 그 분류 그룹 안에서만
 * 컬럼으로 추가된다. 속성 key를 더하거나 라벨을 바꿀 땐 이 파일과
 * content/products/SCHEMA.md 만 고치면 된다.
 *
 * format:
 *  - "flag": 값이 있으면(truthy) "표시됨" 표식, null/false면 빈 표식
 *  - "text": 값 문자열을 그대로 노출 (예: fire "준불연", abrasion "AC5")
 */

import type { CategoryLabel } from "./categories";

export type AttrFormat = "flag" | "text";
export type AttrDef = { key: string; label: string; format: AttrFormat };

export const CORE_ATTRS: readonly AttrDef[] = [
  { key: "fire", label: "화재", format: "text" },
  { key: "eco", label: "환경표지", format: "flag" },
  { key: "hyg", label: "항균", format: "flag" },
  { key: "voc", label: "유해물질", format: "flag" },
];

// 확장 속성은 "현재 카탈로그에 실제로 값이 있는 것"만 둡니다. 값이 하나도 없는
// 항목(내마모등급/온돌/의자바퀴/경량성 등)은 넣지 않으며, 총괄표는 여기 정의된
// 컬럼 중에서도 그 분류에 값이 전무하면 자동으로 숨깁니다(usedAttrsForCategory).
export const CATEGORY_ATTRS: Record<CategoryLabel, readonly AttrDef[]> = {
  벽재: [
    { key: "aco", label: "흡음·차음", format: "text" },
    { key: "imp", label: "내충격", format: "flag" },
  ],
  바닥재: [
    { key: "slip", label: "미끄럼저항", format: "text" },
    { key: "abrasion", label: "내마모", format: "text" },
    { key: "dim_stability", label: "치수안정성", format: "flag" },
  ],
  천장재: [
    { key: "nrc", label: "흡음률(NRC)", format: "text" },
    { key: "sag", label: "처짐저항", format: "flag" },
    { key: "humidity", label: "내습성", format: "flag" },
  ],
};

/** 코어 + 해당 분류 확장 속성 정의(렌더 순서대로). */
export function attrsForCategory(label: CategoryLabel): AttrDef[] {
  return [...CORE_ATTRS, ...CATEGORY_ATTRS[label]];
}

/**
 * 코어 전체 + 확장 중 `hasValue(key)` 가 true 인 것만.
 * 총괄표에서 그 분류에 값이 전무한 확장 컬럼을 숨길 때 사용.
 */
export function usedAttrsForCategory(
  label: CategoryLabel,
  hasValue: (key: string) => boolean
): AttrDef[] {
  return [...CORE_ATTRS, ...CATEGORY_ATTRS[label].filter((d) => hasValue(d.key))];
}
