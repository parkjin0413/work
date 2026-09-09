import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSearch, type ProductListItem } from "./ProductSearch";

const items: ProductListItem[] = [
  {
    slug: "laminate-tile-hpl",
    categorySlug: "wall",
    category: "벽재",
    name: "라미네이트 타일",
    productType: "HPL 방수 벽 타일",
    material: "HPL 표면 마감 타일",
    summary: "다양한 패턴의 방수 벽 타일",
    certLabels: ["VOC 방출"],
    typeCount: 3,
    badges: ["유해물질", "흡음·차음"],
    discontinued: false,
  },
  {
    slug: "prime-perforated-board",
    categorySlug: "wall",
    category: "벽재",
    name: "프라임 타공보드",
    productType: "흡음 타공 보드",
    material: "규산칼슘",
    summary: "소음 저감 흡음 보드",
    certLabels: ["흡음 성능 인증"],
    typeCount: 3,
    badges: ["화재 준불연", "흡음·차음"],
    discontinued: false,
  },
];

describe("ProductSearch", () => {
  it("전체 제품을 링크 카드로 보여준다", () => {
    render(<ProductSearch products={items} />);
    expect(screen.getByRole("link", { name: /라미네이트 타일/ })).toHaveAttribute(
      "href",
      "/products/wall#laminate-tile-hpl"
    );
    expect(screen.getByRole("link", { name: /프라임 타공보드/ })).toBeInTheDocument();
  });

  it("검색어로 목록을 좁힌다", () => {
    render(<ProductSearch products={items} />);
    fireEvent.change(screen.getByLabelText("제품 검색"), { target: { value: "타공" } });
    expect(screen.queryByRole("link", { name: /라미네이트 타일/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /프라임 타공보드/ })).toBeInTheDocument();
  });

  it("인증명으로도 검색된다", () => {
    render(<ProductSearch products={items} />);
    fireEvent.change(screen.getByLabelText("제품 검색"), { target: { value: "흡음 성능" } });
    expect(screen.getByRole("link", { name: /프라임 타공보드/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /라미네이트 타일/ })).not.toBeInTheDocument();
  });

  it("분류 칩으로 필터링하고 전체로 복귀한다", () => {
    render(<ProductSearch products={items} />);
    fireEvent.click(screen.getByRole("button", { name: "바닥재" }));
    expect(screen.getByText("조건에 맞는 제품이 없습니다.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "전체" }));
    expect(screen.getByRole("link", { name: /라미네이트 타일/ })).toBeInTheDocument();
  });
});
