import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductComparison, type ComparisonItem } from "./ProductComparison";
import { getProductsByCategory } from "@/lib/products/productsStore";

function items(): ComparisonItem[] {
  return getProductsByCategory("벽재").map((product) => ({
    product,
    copy: { plain: "PLAIN", markdown: "MD", json: "{}", claude: "CLAUDE" },
  }));
}

describe("ProductComparison", () => {
  it("3제품 열 머리(이름)를 나란히 보여준다", () => {
    render(<ProductComparison items={items()} />);
    expect(screen.getByRole("heading", { name: "라미네이트 판넬", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "라미네이트 타일", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프라임 타공보드", level: 3 })).toBeInTheDocument();
  });

  it("섹션 라벨이 섹션당 한 번만 나오고, 그 아래 3제품 내용이 들어간다", () => {
    render(<ProductComparison items={items()} />);
    for (const label of [
      "성능",
      "기본 정보",
      "핵심 특징",
      "특징 상세",
      "타입별 규격",
      "색상 / 디자인 옵션",
      "인증",
      "설치 방법",
      "마감 옵션",
      "제품 설명",
    ]) {
      expect(screen.getAllByText(label)).toHaveLength(1);
    }
    // 라미네이트 타일 색상(디자인) 스와치
    expect(screen.getByText("Calacatta")).toBeInTheDocument();
  });

  it("제품마다 복사 버튼 4종을 열 머리에 준다", () => {
    render(<ProductComparison items={items()} />);
    expect(screen.getAllByRole("button", { name: "텍스트" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "마크다운 원문" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "JSON" })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: "Claude용" })).toHaveLength(3);
  });

  it("제품 열 머리에 앵커용 id 를 단다", () => {
    const { container } = render(<ProductComparison items={items()} />);
    expect(container.querySelector("#laminate-tile-hpl")).not.toBeNull();
  });

  it("빈 섹션은 '정보 없음' 블록으로 채운다 (프라임 타공보드·판넬의 설치/마감 등)", () => {
    render(<ProductComparison items={items()} />);
    expect(screen.getAllByText("정보 없음").length).toBeGreaterThanOrEqual(2);
  });
});
