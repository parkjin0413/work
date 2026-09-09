import { describe, it, expect } from "vitest";
import {
  CORE_ATTRS,
  CATEGORY_ATTRS,
  attrsForCategory,
  usedAttrsForCategory,
} from "./attributeSchema";

describe("CORE_ATTRS", () => {
  it("전 분류 공통 코어 4개 (fire, eco, hyg, voc) — 방수·방습은 제거", () => {
    expect(CORE_ATTRS.map((a) => a.key)).toEqual(["fire", "eco", "hyg", "voc"]);
  });

  it("fire 는 text, 나머지 코어는 flag", () => {
    expect(CORE_ATTRS.find((a) => a.key === "fire")?.format).toBe("text");
    for (const key of ["eco", "hyg", "voc"]) {
      expect(CORE_ATTRS.find((a) => a.key === key)?.format).toBe("flag");
    }
  });
});

describe("CATEGORY_ATTRS", () => {
  it("벽재 확장은 aco, imp", () => {
    expect(CATEGORY_ATTRS["벽재"].map((a) => a.key)).toEqual(["aco", "imp"]);
  });

  it("확장은 실제 값이 있는 것만 (바닥재 3, 천장재 3)", () => {
    expect(CATEGORY_ATTRS["바닥재"].map((a) => a.key)).toEqual([
      "slip",
      "abrasion",
      "dim_stability",
    ]);
    expect(CATEGORY_ATTRS["천장재"].map((a) => a.key)).toEqual(["nrc", "sag", "humidity"]);
  });

  it("등급/수치형 속성은 text 포맷", () => {
    const floor = Object.fromEntries(CATEGORY_ATTRS["바닥재"].map((a) => [a.key, a.format]));
    expect(floor.slip).toBe("text");
    expect(floor.abrasion).toBe("text");
    expect(floor.dim_stability).toBe("flag");
    expect(CATEGORY_ATTRS["천장재"].find((a) => a.key === "nrc")?.format).toBe("text");
  });
});

describe("attrsForCategory", () => {
  it("코어 4개 + 그 분류 확장을 순서대로 이어붙인다", () => {
    expect(attrsForCategory("벽재").map((a) => a.key)).toEqual([
      "fire", "eco", "hyg", "voc", "aco", "imp",
    ]);
    expect(attrsForCategory("바닥재")).toHaveLength(4 + 3);
    expect(attrsForCategory("천장재")).toHaveLength(4 + 3);
  });
});

describe("usedAttrsForCategory", () => {
  it("코어는 항상, 확장은 hasValue 가 true 인 것만", () => {
    const used = usedAttrsForCategory("바닥재", (key) => key === "slip");
    expect(used.map((a) => a.key)).toEqual(["fire", "eco", "hyg", "voc", "slip"]);
  });

  it("확장에 값이 하나도 없으면 코어 4개만", () => {
    expect(usedAttrsForCategory("천장재", () => false).map((a) => a.key)).toEqual([
      "fire", "eco", "hyg", "voc",
    ]);
  });
});
