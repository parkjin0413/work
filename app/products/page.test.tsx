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
      screen.getByRole("link", { name: /라미네이트 판넬 10\.2T/ })
    ).toHaveAttribute("href", "/products/wall#laminate-panel-10-2t");
    expect(
      screen.getByRole("link", { name: /마모렛/ })
    ).toHaveAttribute("href", "/products/floor#linoleum-marmorette");
  });
});
