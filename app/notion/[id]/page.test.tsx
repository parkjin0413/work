import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import NotionDatabasePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { getDatabaseItemsMock } = vi.hoisted(() => ({
  getDatabaseItemsMock: vi.fn(),
}));

vi.mock("@/lib/notion/notionClient", () => ({
  getDatabaseItems: getDatabaseItemsMock,
}));

async function renderPage(id: string) {
  const element = await NotionDatabasePage({ params: { id } });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("NotionDatabasePage", () => {
  beforeEach(() => {
    getDatabaseItemsMock.mockReset();
  });

  it("데이터베이스 제목과 항목 목록을 보여준다", async () => {
    getDatabaseItemsMock.mockResolvedValue({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [{ id: "page-1", title: "첫 항목" }],
    });

    await renderPage("db-1");

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByText("첫 항목")).toBeInTheDocument();
  });

  it("항목이 없으면 안내 문구를 보여준다", async () => {
    getDatabaseItemsMock.mockResolvedValue({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [],
    });

    await renderPage("db-1");

    expect(screen.getByText("항목이 없습니다.")).toBeInTheDocument();
  });

  it("데이터베이스를 찾을 수 없으면 공유 안내를 보여준다", async () => {
    getDatabaseItemsMock.mockResolvedValue(null);

    await renderPage("missing-db");

    expect(
      screen.getByText(/이 데이터베이스를 찾을 수 없습니다. Notion에서 데이터베이스를 열고/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "데이터베이스 목록으로 돌아가기" })).toHaveAttribute(
      "href",
      "/notion"
    );
  });

  it("조회가 실패하면 문제 안내를 보여준다", async () => {
    getDatabaseItemsMock.mockRejectedValue(new Error("invalid token"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderPage("db-1");

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();

    expect(
      screen.getByText("Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.")
    ).toBeInTheDocument();
  });
});
