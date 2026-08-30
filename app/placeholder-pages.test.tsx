import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import DrivePage from "./drive/page";
import NotionPage from "./notion/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

function renderPage(page: React.ReactElement) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {page}
    </ThemeProvider>
  );
}

describe("서비스별 빈 라우트", () => {
  it("Drive 페이지는 한글 안내 문구와 홈으로 돌아가는 링크를 보여준다", () => {
    renderPage(<DrivePage />);
    expect(
      screen.getByText("Google Drive 연동 기능은 다음 단계에서 구현됩니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
  });

  it("Notion 페이지는 한글 안내 문구와 홈으로 돌아가는 링크를 보여준다", () => {
    renderPage(<NotionPage />);
    expect(screen.getByText("Notion 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
  });
});
