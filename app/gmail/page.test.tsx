import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import GmailPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/gmail",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { isGoogleConnectedMock, listRecentMessagesMock } = vi.hoisted(() => ({
  isGoogleConnectedMock: vi.fn(),
  listRecentMessagesMock: vi.fn(),
}));

vi.mock("@/lib/google/gmailClient", () => ({
  isGoogleConnected: isGoogleConnectedMock,
  listRecentMessages: listRecentMessagesMock,
}));

async function renderGmailPage(searchParams: { error?: string; connected?: string } = {}) {
  const element = await GmailPage({ searchParams });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("GmailPage", () => {
  beforeEach(() => {
    isGoogleConnectedMock.mockReset();
    listRecentMessagesMock.mockReset();
  });

  it("연결되지 않은 경우 Google 계정 연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(false);

    await renderGmailPage({});

    expect(
      screen.getByText("Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google 계정 연결" })).toHaveAttribute(
      "href",
      "/api/auth/google/start"
    );
    expect(listRecentMessagesMock).not.toHaveBeenCalled();
  });

  it("연결된 경우 최근 메일 목록을 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([
      {
        id: "msg-1",
        subject: "테스트 제목",
        from: "sender@example.com",
        date: "2026-08-30",
        snippet: "미리보기",
      },
    ]);

    await renderGmailPage({});

    expect(screen.getByText("테스트 제목")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /테스트 제목/ })).toHaveAttribute(
      "href",
      "/gmail/msg-1"
    );
  });

  it("연결되었지만 메일이 없으면 안내 문구를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({});

    expect(screen.getByText("받은 메일이 없습니다.")).toBeInTheDocument();
  });

  it("메일 목록 조회가 실패하면 재연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockRejectedValue(new Error("token expired"));

    await renderGmailPage({});

    expect(
      screen.getByText("Gmail 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google 계정 다시 연결" })).toHaveAttribute(
      "href",
      "/api/auth/google/start"
    );
  });

  it("연결 성공 쿼리 파라미터가 있으면 확인 메시지를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({ connected: "1" });

    expect(screen.getByText("Google 계정이 연결되었습니다.")).toBeInTheDocument();
  });
});
