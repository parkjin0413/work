import { describe, it, expect } from "vitest";
import path from "path";
import {
  getAllProducts,
  getProductsByCategory,
  getProductBySlug,
  getRawMarkdown,
  getCatalogRows,
  getCatalog,
  type Product,
} from "./productsStore";
import { deriveAttributes, deriveAttributesForType } from "./attributes";

const MINIMAL_ROOT = path.join(process.cwd(), "test", "fixtures", "products-minimal");

describe("getAllProducts — 실제 content/products", () => {
  it("3분류 12종을 읽는다 (벽재 3 · 바닥재 7 · 천장재 2)", () => {
    const products = getAllProducts();
    expect(products).toHaveLength(12);
    expect(products.filter((p) => p.category === "벽재")).toHaveLength(3);
    expect(products.filter((p) => p.category === "바닥재")).toHaveLength(7);
    expect(products.filter((p) => p.category === "천장재")).toHaveLength(2);
  });

  it("라미네이트 타일: 타입 3개 · 색상 29종 · 인증은 시험성적서에서, 타입별로 다름", () => {
    const tile = getProductBySlug("wall", "laminate-tile-hpl");
    expect(tile).toBeDefined();
    expect(tile!.types).toHaveLength(3);
    expect(tile!.colors).toHaveLength(29);
    expect(tile!.certifications.length).toBeGreaterThan(0);
    // types 에 attributes 필드가 더 이상 없음 (총괄표에서 파생)
    expect(tile!.types[0]).not.toHaveProperty("attributes");
    // 방염 성적서는 5.0T / 4.5T 만, 4.2T 는 성적서 없음
    const feedsFire = tile!.certifications.filter((c) => c.feeds === "fire");
    expect(feedsFire.map((c) => c.applies_to).sort()).toEqual(["4.5T", "5.0T"]);
  });

  it("프라임 타공보드: 원형 9T + 라인 10T/12T = 3행", () => {
    const board = getProductBySlug("wall", "prime-perforated-board");
    expect(board!.types).toHaveLength(3);
    expect(board!.types[0].group).toBe("원형타공");
    expect(board!.types[1].group).toBe("라인타공");
    expect(board!.types.map((t) => t.typeName)).toEqual(["9T", "10T", "12T"]);
  });

  it("천장재/바닥재 제품명·타입은 유지, 성능값은 시험성적서에서 파생", () => {
    const gyp = getProductBySlug("ceiling", "gypsonic-gypsum-ceiling")!;
    expect(gyp.name).toBe("천연석고 천장재");
    expect(getProductBySlug("ceiling", "rf-perforated-ceiling")!.name).toBe("RF타공 천장재");
    expect(getProductBySlug("floor", "emotion-sheet")!.name).toBe("이모션 시트");
    // 불연성 시험 + 유해물질 시험 → fire=불연, voc=true
    const agg = deriveAttributes(gyp.category, gyp.certifications);
    expect(agg.fire).toBe("불연");
    expect(agg.voc).toBe(true);
    // 이모션 시트: 환경표지 + 미끄럼저항 + 항바이러스(ISO 21702) → eco/slip/hyg
    const emotion = getProductBySlug("floor", "emotion-sheet")!;
    const eAgg = deriveAttributes(emotion.category, emotion.certifications);
    expect(eAgg.hyg).toBe(true);
    expect(eAgg.eco).toBe(true);
    expect(String(eAgg.slip)).toContain("0.37");
  });

  it("본문(body)과 dir 이 채워진다", () => {
    const panel = getProductBySlug("wall", "laminate-panel-10-2t")!;
    expect(panel.body.length).toBeGreaterThan(0);
    expect(panel.dir).toBe("content/products/wall/laminate-panel-10-2t");
    expect(panel.status).toBe("active");
  });
});

describe("getProductsByCategory", () => {
  it("분류별로 거른다", () => {
    expect(getProductsByCategory("바닥재")).toHaveLength(7);
    expect(getProductsByCategory("천장재")).toHaveLength(2);
    expect(getProductsByCategory("바닥재").every((p) => p.category === "바닥재")).toBe(true);
  });
});

describe("getProductBySlug", () => {
  it("없는 slug 는 undefined", () => {
    expect(getProductBySlug("wall", "does-not-exist")).toBeUndefined();
    expect(getProductBySlug("wall", "linoleum-marmorette")).toBeUndefined(); // 분류 불일치
  });
});

describe("getRawMarkdown", () => {
  it("frontmatter 로 시작하는 원문을 준다", () => {
    const raw = getRawMarkdown("wall", "laminate-tile-hpl");
    expect(raw?.startsWith("---")).toBe(true);
    expect(raw).toContain("name: 라미네이트 타일");
  });

  it("없는 제품은 undefined", () => {
    expect(getRawMarkdown("wall", "nope")).toBeUndefined();
  });
});

describe("getCatalogRows", () => {
  it("제품 × 타입 = 22행 (벽재 7 · 바닥재 13 · 천장재 2)", () => {
    const rows = getCatalogRows();
    expect(rows).toHaveLength(22);
    expect(rows.filter((r) => r.category === "벽재")).toHaveLength(7);
    expect(rows.filter((r) => r.category === "바닥재")).toHaveLength(13);
    expect(rows.filter((r) => r.category === "천장재")).toHaveLength(2);
    for (const row of rows) {
      expect(typeof row.productName).toBe("string");
      expect(typeof row.size).toBe("string");
      expect(row.attributes).toBeTypeOf("object");
    }
  });
});

describe("getCatalog", () => {
  it("{ generatedAt, products } 형태이고 제품 12개", () => {
    const catalog = getCatalog();
    expect(typeof catalog.generatedAt).toBe("string");
    expect(catalog.products).toHaveLength(12);
  });
});

describe("누락 필드 백필 — 최소 frontmatter 픽스처", () => {
  it("빠진 배열/문자열 필드가 기본값으로 채워진다", () => {
    const [p] = getAllProducts(MINIMAL_ROOT);
    expect(p.slug).toBe("minimal");
    expect(p.name).toBe("최소 제품");
    expect(p.category).toBe("벽재");
    expect(p.status).toBe("active");

    expect(p.features).toEqual([]);
    expect(p.highlightFeatures).toEqual([]);
    expect(p.colors).toEqual([]);
    expect(p.certifications).toEqual([]);
    expect(p.installationMethods).toEqual([]);
    expect(p.finishingOptions).toEqual([]);
    expect(p.images).toEqual([]);

    expect(p.material).toBe("");
    expect(p.structure).toBe("");
    expect(p.summary).toBe("");
    expect(p.colorsNote).toBe("");

    // types 는 절대 비어있지 않다 — placeholder 1행 보장
    expect(p.types).toHaveLength(1);
    expect(p.types[0]).not.toHaveProperty("attributes");
    expect(p.body).toContain("본문만 있는 최소 제품");
  });
});

describe("deriveAttributes — certifications 에서 총괄표 성능값 파생", () => {
  const wall = "벽재" as Product["category"];
  const base = { body: "", standard: "", number: "", issued: "", expires: "", scope: "", note: "" };

  it("feeds 로 flag/text 컬럼을 채우고, feeds 없으면 무시", () => {
    const agg = deriveAttributes(wall, [
      { ...base, name: "친환경표지 인증", result: "인증", feeds: "eco" },
      { ...base, name: "준불연 성능 인증", result: "준불연", scope: "국내", feeds: "fire" },
      { ...base, name: "흡음 시험", result: "0.7", feeds: "" }, // feeds 없음 → 무시
    ]);
    expect(agg.eco).toBe(true);
    expect(agg.fire).toBe("준불연");
    expect(agg.hyg).toBe(false); // feeds 없는 컬럼은 flag 기본값
  });

  it("fire 는 scope 가 '국내' 인 인증만 반영", () => {
    const agg = deriveAttributes(wall, [
      { ...base, name: "화재에 대한 반응", result: "Bfl-s1", scope: "유럽(EU)", feeds: "fire" },
    ]);
    expect(agg.fire ?? null).toBeNull();
  });

  it("applies_to 로 타입 행마다 다르게 파생 (프라임 타공보드)", () => {
    const board = getProductBySlug("wall", "prime-perforated-board")!;
    const c = board.certifications;
    // 원형타공 9T: 준불연만 (RF타공 천장재와 공유하는 성적서), 환경표지·흡음은 라인타공 전용
    const a9 = deriveAttributesForType("벽재", c, "9T");
    expect(a9.fire).toBe("준불연");
    expect(a9.eco).toBe(false); // flag 컬럼 기본값
    expect(a9.aco ?? null).toBeNull(); // text 컬럼, 9T 엔 흡음 성적서 없음
    // 라인타공 10T / 12T: 준불연 + 환경표지 + 흡음계수(값이 서로 다름)
    const a10 = deriveAttributesForType("벽재", c, "10T");
    const a12 = deriveAttributesForType("벽재", c, "12T");
    expect(a10.fire).toBe("준불연");
    expect(a12.fire).toBe("준불연");
    expect(a10.eco).toBe(true);
    expect(String(a10.aco)).toContain("0.40");
    expect(String(a12.aco)).toContain("0.35");
  });
});
