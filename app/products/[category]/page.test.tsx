import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import CategoryPage, { generateStaticParams } from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/products",
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

function renderPage(category: string) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {CategoryPage({ params: { category } })}
    </ThemeProvider>
  );
}

describe("generateStaticParams", () => {
  it("wall/floor/ceiling 3개를 반환한다", () => {
    expect(generateStaticParams()).toEqual([
      { category: "wall" },
      { category: "floor" },
      { category: "ceiling" },
    ]);
  });
});

describe("CategoryPage", () => {
  it("벽재: 총괄표 + 3종 항목별 비교를 한 화면에 보여준다", () => {
    renderPage("wall");
    expect(screen.getByRole("heading", { name: "벽재", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("규격 총괄표")).toBeInTheDocument();
    expect(screen.getByText("항목별 비교")).toBeInTheDocument();

    // 3종이 모두 열 머리로
    expect(screen.getByRole("heading", { name: "라미네이트 판넬", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "라미네이트 타일", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "프라임 타공보드", level: 3 })).toBeInTheDocument();
  });

  it("바닥재: 7종을 항목별 비교로 보여준다", () => {
    renderPage("floor");
    expect(screen.getByRole("heading", { name: "바닥재", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("항목별 비교")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "이모션 시트", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "마모렛 (리노륨)", level: 3 })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Claude용" })).toHaveLength(7);
    // 제품마다 개별 MD 다운로드 + 분류 전체 MD 다운로드
    expect(screen.getAllByRole("button", { name: "MD 다운로드" })).toHaveLength(7);
    expect(
      screen.getByRole("button", { name: "바닥재 전체 MD 다운로드" })
    ).toBeInTheDocument();
  });

  it("천장재: 2종을 보여준다", () => {
    renderPage("ceiling");
    expect(screen.getByRole("heading", { name: "천연석고 천장재", level: 3 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "RF타공 천장재", level: 3 })).toBeInTheDocument();
  });

  it("잘못된 분류는 notFound()", () => {
    expect(() => renderPage("roof")).toThrow("NEXT_NOT_FOUND");
  });
});
