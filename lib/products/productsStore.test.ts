import { describe, it, expect } from "vitest";
import path from "path";
import {
  getAllProducts,
  getProductsByCategory,
  getProductBySlug,
  getRawMarkdown,
  getCatalogRows,
  getCatalog,
} from "./productsStore";

const MINIMAL_ROOT = path.join(process.cwd(), "test", "fixtures", "products-minimal");

describe("getAllProducts — 실제 content/products", () => {
  it("3분류 12종을 읽는다 (벽재 3 · 바닥재 7 · 천장재 2)", () => {
    const products = getAllProducts();
    expect(products).toHaveLength(12);
    expect(products.filter((p) => p.category === "벽재")).toHaveLength(3);
    expect(products.filter((p) => p.category === "바닥재")).toHaveLength(7);
    expect(products.filter((p) => p.category === "천장재")).toHaveLength(2);
  });

  it("라미네이트 타일: 타입 3개 · 색상 29종 · 인증 6개", () => {
    const tile = getProductBySlug("wall", "laminate-tile-hpl");
    expect(tile).toBeDefined();
    expect(tile!.types).toHaveLength(3);
    expect(tile!.colors).toHaveLength(29);
    expect(tile!.certifications).toHaveLength(6);
    expect(tile!.types[0].attributes.voc).toBe(true);
    expect(tile!.types[0].attributes.wtp).toBe(true);
    expect(tile!.types[0].attributes.fire ?? null).toBeNull();
  });

  it("프라임 타공보드: 원형 9T + 라인 10T/12T = 3행, 전부 준불연", () => {
    const board = getProductBySlug("wall", "prime-perforated-board");
    expect(board!.types).toHaveLength(3);
    expect(board!.types[0].group).toBe("원형타공");
    expect(board!.types[1].group).toBe("라인타공");
    expect(board!.types.map((t) => t.typeName)).toEqual(["9T", "10T", "12T"]);
    expect(board!.types.every((t) => t.attributes.fire === "준불연")).toBe(true);
  });

  it("천장재: 천연석고는 불연, RF 타공은 준불연·내습성", () => {
    const gyp = getProductBySlug("ceiling", "gypsonic-gypsum-ceiling")!;
    const rf = getProductBySlug("ceiling", "rf-perforated-ceiling")!;
    expect(gyp.name).toBe("천연석고 천장재");
    expect(gyp.types[0].attributes.fire).toBe("불연");
    expect(gyp.types[0].attributes.nrc).toBe(true);
    expect(rf.types[0].attributes.fire).toBe("준불연");
    expect(rf.types[0].attributes.humidity).toBe(true);
  });

  it("바닥재: 아티스틱 타일 R9, 라미네이트 후로링 AC6 + 유럽 화재등급은 fire 아님", () => {
    const tile = getProductBySlug("floor", "artistic-tile")!;
    const lam = getProductBySlug("floor", "laminate-flooring")!;
    const emotion = getProductBySlug("floor", "emotion-sheet")!;
    expect(tile.types[0].attributes.slip).toBe("R9");
    expect(lam.types[0].attributes.abrasion).toBe("AC6");
    expect(lam.types[0].attributes.slip).toBe("DS");
    expect(lam.types[0].attributes.fire ?? null).toBeNull(); // Bfl-s1 은 certifications 로
    expect(emotion.name).toBe("이모션 시트");
    expect(emotion.types[0].attributes.eco).toBe(true);
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
    expect(p.certificationDocuments).toEqual([]);
    expect(p.installationMethods).toEqual([]);
    expect(p.finishingOptions).toEqual([]);
    expect(p.images).toEqual([]);

    expect(p.material).toBe("");
    expect(p.structure).toBe("");
    expect(p.summary).toBe("");
    expect(p.colorsNote).toBe("");

    // types 는 절대 비어있지 않다 — placeholder 1행 보장
    expect(p.types).toHaveLength(1);
    expect(p.types[0].attributes).toEqual({});
    expect(p.body).toContain("본문만 있는 최소 제품");
  });
});
