import { describe, it, expect } from "vitest";
import {
  CATEGORY_ORDER,
  isCategorySlug,
  slugToLabel,
  labelToSlug,
  CATEGORY_GROUP_HEADING,
} from "./categories";

describe("CATEGORY_ORDER", () => {
  it("wall → floor → ceiling 순서다", () => {
    expect([...CATEGORY_ORDER]).toEqual(["wall", "floor", "ceiling"]);
  });
});

describe("isCategorySlug", () => {
  it("정의된 slug만 true", () => {
    expect(isCategorySlug("wall")).toBe(true);
    expect(isCategorySlug("floor")).toBe(true);
    expect(isCategorySlug("ceiling")).toBe(true);
  });

  it("그 외 값은 false", () => {
    expect(isCategorySlug("roof")).toBe(false);
    expect(isCategorySlug("벽재")).toBe(false);
    expect(isCategorySlug("")).toBe(false);
    expect(isCategorySlug(undefined)).toBe(false);
    expect(isCategorySlug(3)).toBe(false);
  });
});

describe("slug ↔ label 매핑", () => {
  it("slugToLabel", () => {
    expect(slugToLabel("wall")).toBe("벽재");
    expect(slugToLabel("floor")).toBe("바닥재");
    expect(slugToLabel("ceiling")).toBe("천장재");
  });

  it("labelToSlug", () => {
    expect(labelToSlug("벽재")).toBe("wall");
    expect(labelToSlug("바닥재")).toBe("floor");
    expect(labelToSlug("천장재")).toBe("ceiling");
  });

  it("왕복 변환이 원래 값으로 돌아온다", () => {
    for (const slug of CATEGORY_ORDER) {
      expect(labelToSlug(slugToLabel(slug))).toBe(slug);
    }
  });
});

describe("CATEGORY_GROUP_HEADING", () => {
  it("분류별 총괄표 그룹 헤더 문구가 있다", () => {
    expect(CATEGORY_GROUP_HEADING["벽재"]).toContain("WALL");
    expect(CATEGORY_GROUP_HEADING["바닥재"]).toContain("FLOOR");
    expect(CATEGORY_GROUP_HEADING["천장재"]).toContain("CEILING");
  });
});
