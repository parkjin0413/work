/**
 * 제품 분류 — 폴더 slug(wall/floor/ceiling) ↔ 한글 라벨(벽재/바닥재/천장재) 매핑.
 * 로더·라우트·렌더가 전부 이 파일 하나만 참조한다.
 */

export const CATEGORY_ORDER = ["wall", "floor", "ceiling"] as const;

export type CategorySlug = (typeof CATEGORY_ORDER)[number];
export type CategoryLabel = "벽재" | "바닥재" | "천장재";

const SLUG_TO_LABEL: Record<CategorySlug, CategoryLabel> = {
  wall: "벽재",
  floor: "바닥재",
  ceiling: "천장재",
};

const LABEL_TO_SLUG: Record<CategoryLabel, CategorySlug> = {
  벽재: "wall",
  바닥재: "floor",
  천장재: "ceiling",
};

/** 총괄표 그룹 헤더 문구. */
export const CATEGORY_GROUP_HEADING: Record<CategoryLabel, string> = {
  벽재: "WALL · 벽 마감재",
  바닥재: "FLOOR · 바닥 마감재",
  천장재: "CEILING · 천장 마감재",
};

export function isCategorySlug(value: unknown): value is CategorySlug {
  return typeof value === "string" && (CATEGORY_ORDER as readonly string[]).includes(value);
}

export function slugToLabel(slug: CategorySlug): CategoryLabel {
  return SLUG_TO_LABEL[slug];
}

export function labelToSlug(label: CategoryLabel): CategorySlug {
  return LABEL_TO_SLUG[label];
}
