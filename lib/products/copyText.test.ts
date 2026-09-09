import { describe, it, expect } from "vitest";
import { buildPlainText, buildJson, buildClaudeBlock } from "./copyText";
import { getProductBySlug } from "./productsStore";

const tile = getProductBySlug("wall", "laminate-tile-hpl")!;
const board = getProductBySlug("wall", "prime-perforated-board")!;

describe("buildPlainText", () => {
  it("주요 섹션 헤더를 포함한다", () => {
    const text = buildPlainText(tile);
    expect(text).toContain("제품명: 라미네이트 타일");
    expect(text).toContain("[요약]");
    expect(text).toContain("[기본정보]");
    expect(text).toContain("[타입별 규격]");
    expect(text).toContain("[성능]");
    expect(text).toContain("[인증]");
  });

  it("성능 줄은 코어+벽재 확장 컬럼을 나열하고, 값은 인증에서 파생(전 타입 합집합)", () => {
    const text = buildPlainText(board);
    const perfLine = text.split("\n").find((l) => l.startsWith("[성능]"))!;
    expect(perfLine).toContain("화재:준불연"); // 라인타공 준불연 성적서
    expect(perfLine).toContain("환경표지:O"); // EL248
    expect(perfLine).toContain("흡음·차음:흡음계수"); // 잔향실법 흡음계수
    expect(perfLine).toContain("항균:정보 없음"); // 성적서 없음
  });

  it("빈 필드는 '정보 없음'", () => {
    const board2 = buildPlainText(board);
    // 프라임 타공보드는 시공방법이 비어있음
    expect(board2).toMatch(/\[설치방법\]\n정보 없음/);
  });
});

describe("buildJson", () => {
  it("파싱 가능한 Product JSON", () => {
    const parsed = JSON.parse(buildJson(tile));
    expect(parsed.slug).toBe("laminate-tile-hpl");
    expect(parsed.types).toHaveLength(3);
  });
});

describe("buildClaudeBlock", () => {
  it("스키마·원본 경로 안내로 시작하고 평문이 이어진다", () => {
    const text = buildClaudeBlock(tile);
    expect(text.startsWith("아래는 강산이엔지 제품 데이터입니다.")).toBe(true);
    expect(text).toContain("content/products/SCHEMA.md");
    expect(text).toContain("content/products/wall/laminate-tile-hpl/product.md");
    expect(text).toContain("제품명: 라미네이트 타일");
  });
});
