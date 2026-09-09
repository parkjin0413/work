import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import ProductsRollupPrintPage from "./page";

describe("ProductsRollupPrintPage", () => {
  it("표지 + 3분류 표 + 파생 성능값을 렌더한다", () => {
    render(ProductsRollupPrintPage());

    expect(
      screen.getByRole("heading", { name: "강산이엔지 제품 규격 총괄표", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/제품 × 타입 22행/)).toBeInTheDocument();

    // 분류 헤더 3개
    expect(screen.getByRole("heading", { name: /WALL · 벽 마감재/, level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /FLOOR · 바닥 마감재/, level: 3 })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /CEILING · 천장 마감재/, level: 3 })
    ).toBeInTheDocument();

    // 파생 성능값이 셀에 나온다 (프라임 타공보드 라인타공 흡음계수)
    expect(screen.getByText(/프라임 타공보드.*10T/)).toBeInTheDocument();
    expect(screen.getAllByText("흡음계수 0.40").length).toBeGreaterThan(0);
  });

  it("인쇄 버튼과 데이터시트 인쇄 교차 링크가 있다", () => {
    render(ProductsRollupPrintPage());
    expect(screen.getByRole("button", { name: /인쇄/ })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /제품별 데이터시트 인쇄/ })
    ).toHaveAttribute("href", "/products/print");
  });

  it("국내 건축자재 기준 요약을 함께 인쇄한다", () => {
    render(ProductsRollupPrintPage());
    expect(
      screen.getByRole("heading", { name: /국내 건축자재 기준 \(요약\)/ })
    ).toBeInTheDocument();
    expect(screen.getByText("준불연재료")).toBeInTheDocument();
    expect(screen.getByText("환경표지(환경마크)")).toBeInTheDocument();
    // 미끄럼저항 기준치 함께 기재
    expect(screen.getByText(/물 사용 공간 0\.5 이상/)).toBeInTheDocument();
  });

  it("천장재 표에 RF타공 천장재 준불연이 표기된다", () => {
    render(ProductsRollupPrintPage());
    const ceiling = screen
      .getByRole("heading", { name: /CEILING · 천장 마감재/, level: 3 })
      .closest("section")!;
    expect(within(ceiling).getByText(/RF타공 천장재 9T/)).toBeInTheDocument();
    expect(within(ceiling).getAllByText("준불연").length).toBeGreaterThan(0);
  });
});
