import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import ProductsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/products",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

function renderPage() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {ProductsPage()}
    </ThemeProvider>
  );
}

describe("ProductsPage", () => {
  it("제목·총괄표·카탈로그 복사 바를 보여준다", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "제품 정보", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("제품 규격 총괄표")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "catalog.json 복사" })).toBeInTheDocument();
    expect(screen.getByText("/products/catalog.json")).toBeInTheDocument();
  });

  it("인쇄 링크 2개와 국내 기준 요약 섹션을 보여준다", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "총괄표 인쇄" })).toHaveAttribute(
      "href",
      "/products/print/rollup"
    );
    expect(screen.getByRole("link", { name: "제품별 데이터시트 인쇄" })).toHaveAttribute(
      "href",
      "/products/print"
    );
    expect(
      screen.getByRole("heading", { name: /국내 기준 \(요약\)/, level: 2 })
    ).toBeInTheDocument();
    expect(screen.getByText("준불연재료")).toBeInTheDocument();
    expect(screen.getByText("방염(防焰)")).toBeInTheDocument();
    // 방수·방습 컬럼은 제거됨
    expect(screen.queryByText("방수·방습")).not.toBeInTheDocument();
  });

  it("분류 요약 카드 3장 — 벽재 3종, 바닥재 7종, 천장재 2종", () => {
    renderPage();
    expect(screen.getByRole("link", { name: /벽재 3종 등록/ })).toHaveAttribute(
      "href",
      "/products/wall"
    );
    expect(screen.getByRole("link", { name: /바닥재 7종 등록/ })).toHaveAttribute(
      "href",
      "/products/floor"
    );
    expect(screen.getByRole("link", { name: /천장재 2종 등록/ })).toHaveAttribute(
      "href",
      "/products/ceiling"
    );
  });

  it("검색 카드는 분류 페이지의 해당 제품 앵커로 연결한다", () => {
    renderPage();
    expect(
      screen.getByRole("link", { name: /라미네이트 판넬/ })
    ).toHaveAttribute("href", "/products/wall#laminate-panel-10-2t");
    expect(
      screen.getByRole("link", { name: /마모렛/ })
    ).toHaveAttribute("href", "/products/floor#linoleum-marmorette");
  });
});
