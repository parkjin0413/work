import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProductsPrintPage from "./page";

describe("ProductsPrintPage", () => {
  it("표지 + 3분류 헤더 + 전 제품 데이터시트를 렌더한다", () => {
    render(ProductsPrintPage());

    expect(
      screen.getByRole("heading", { name: "강산이엔지 제품 데이터시트", level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText(/전 제품 12종/)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /벽재 \(3종\)/, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /바닥재 \(7종\)/, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /천장재 \(2종\)/, level: 2 })).toBeInTheDocument();

    // 제품 데이터시트 제목 (h2 within article)
    expect(screen.getByRole("heading", { name: "라미네이트 판넬", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "이모션 시트", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RF타공 천장재", level: 2 })).toBeInTheDocument();
  });

  it("각 데이터시트에 성능·타입별 규격·인증 섹션이 있다", () => {
    render(ProductsPrintPage());
    expect(screen.getAllByText("타입별 규격").length).toBe(12);
    expect(screen.getAllByText("성능").length).toBe(12);
    expect(screen.getAllByRole("heading", { name: "인증", level: 3 }).length).toBe(12);
  });

  it("인쇄 버튼이 있다", () => {
    render(ProductsPrintPage());
    expect(screen.getByRole("button", { name: /인쇄/ })).toBeInTheDocument();
  });
});
