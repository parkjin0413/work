import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

describe("HomePage", () => {
  it("Gmail, Drive, Notion 요약 카드를 한글로 보여준다", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <HomePage />
      </ThemeProvider>
    );

    expect(screen.getByText("최근 메일을 확인하고 보낼 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("파일을 조회하고 업로드/관리할 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("Notion 연동 준비 중입니다.")).toBeInTheDocument();
  });

  it("각 요약 카드는 해당 서비스 페이지로 연결된다", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <HomePage />
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: /Gmail/ })).toHaveAttribute("href", "/gmail");
    expect(screen.getByRole("link", { name: /Google Drive/ })).toHaveAttribute("href", "/drive");
    expect(screen.getByRole("link", { name: /Notion/ })).toHaveAttribute("href", "/notion");
  });
});
