import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

const { getGmailSummaryMock, getDriveSummaryMock, getNotionSummaryMock } = vi.hoisted(() => ({
  getGmailSummaryMock: vi.fn(),
  getDriveSummaryMock: vi.fn(),
  getNotionSummaryMock: vi.fn(),
}));

vi.mock("@/lib/dashboard/homeSummary", () => ({
  getGmailSummary: getGmailSummaryMock,
  getDriveSummary: getDriveSummaryMock,
  getNotionSummary: getNotionSummaryMock,
}));

async function renderHomePage() {
  const element = await HomePage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    getGmailSummaryMock.mockReset();
    getDriveSummaryMock.mockReset();
    getNotionSummaryMock.mockReset();
  });

  it("세 서비스의 요약 카드를 한글로 보여준다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "ok", subjects: ["첫 메일"] });
    getDriveSummaryMock.mockResolvedValue({ state: "ok", names: ["문서.txt"] });
    getNotionSummaryMock.mockResolvedValue({ state: "ok", titles: ["할 일 목록"] });

    await renderHomePage();

    expect(screen.getByText("첫 메일")).toBeInTheDocument();
    expect(screen.getByText("문서.txt")).toBeInTheDocument();
    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
  });

  it("각 요약 카드는 해당 서비스 페이지로 연결된다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "not_connected" });
    getDriveSummaryMock.mockResolvedValue({ state: "not_connected" });
    getNotionSummaryMock.mockResolvedValue({ state: "not_configured" });

    await renderHomePage();

    const summarySection = screen.getByRole("region", { name: "서비스 요약" });
    expect(within(summarySection).getByRole("link", { name: /Gmail/ })).toHaveAttribute(
      "href",
      "/gmail"
    );
    expect(within(summarySection).getByRole("link", { name: /Google Drive/ })).toHaveAttribute(
      "href",
      "/drive"
    );
    expect(within(summarySection).getByRole("link", { name: /Notion/ })).toHaveAttribute(
      "href",
      "/notion"
    );
  });

  it("사이드바에 4개의 메뉴가 표시된다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "not_connected" });
    getDriveSummaryMock.mockResolvedValue({ state: "not_connected" });
    getNotionSummaryMock.mockResolvedValue({ state: "not_configured" });

    await renderHomePage();

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
  });
});
