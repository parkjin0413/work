import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import NotionPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/notion",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { isNotionConfiguredMock, listSharedDatabasesMock } = vi.hoisted(() => ({
  isNotionConfiguredMock: vi.fn(),
  listSharedDatabasesMock: vi.fn(),
}));

vi.mock("@/lib/notion/notionClient", () => ({
  isNotionConfigured: isNotionConfiguredMock,
  listSharedDatabases: listSharedDatabasesMock,
}));

async function renderNotionPage() {
  const element = await NotionPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("NotionPage", () => {
  beforeEach(() => {
    isNotionConfiguredMock.mockReset();
    listSharedDatabasesMock.mockReset();
  });

  it("설정되지 않은 경우 환경변수 설정 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(false);

    await renderNotionPage();

    expect(
      screen.getByText(
        "Notion 연동이 설정되지 않았습니다. 관리자가 NOTION_API_KEY 환경변수를 설정해야 합니다."
      )
    ).toBeInTheDocument();
    expect(listSharedDatabasesMock).not.toHaveBeenCalled();
  });

  it("설정되었지만 공유된 데이터베이스가 없으면 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([]);

    await renderNotionPage();

    expect(
      screen.getByText(
        "공유된 데이터베이스가 없습니다. Notion에서 사용할 데이터베이스를 열고 이 Integration과 공유해주세요."
      )
    ).toBeInTheDocument();
  });

  it("공유된 데이터베이스 목록을 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([{ id: "db-1", title: "할 일 목록" }]);

    await renderNotionPage();

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /할 일 목록/ })).toHaveAttribute(
      "href",
      "/notion/db-1"
    );
  });

  it("목록 조회가 실패하면 문제 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockRejectedValue(new Error("invalid token"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderNotionPage();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();

    expect(
      screen.getByText("Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.")
    ).toBeInTheDocument();
  });
});
