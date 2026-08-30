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

    expect(screen.getByText("Gmail 연동 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByText("Drive 연동 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByText("Notion 연동 준비 중입니다.")).toBeInTheDocument();
  });
});
