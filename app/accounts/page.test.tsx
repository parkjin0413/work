import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import AccountsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/accounts",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { listCategoriesWithAccountsMock } = vi.hoisted(() => ({
  listCategoriesWithAccountsMock: vi.fn(),
}));

vi.mock("@/lib/accounts/accountsStore", () => ({
  listCategoriesWithAccounts: listCategoriesWithAccountsMock,
}));

async function renderAccountsPage() {
  const element = await AccountsPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("AccountsPage", () => {
  beforeEach(() => {
    listCategoriesWithAccountsMock.mockReset();
  });

  it("카테고리가 없으면 안내 문구를 보여준다", async () => {
    listCategoriesWithAccountsMock.mockResolvedValue([]);

    await renderAccountsPage();

    expect(screen.getByText("카테고리를 먼저 만들어주세요.")).toBeInTheDocument();
  });

  it("계정이 없는 카테고리는 안내 문구를 보여준다", async () => {
    listCategoriesWithAccountsMock.mockResolvedValue([{ id: "cat-1", name: "업무", accounts: [] }]);

    await renderAccountsPage();

    expect(screen.getByText("업무")).toBeInTheDocument();
    expect(screen.getByText("등록된 계정이 없습니다.")).toBeInTheDocument();
  });

  it("카테고리별 계정 카드를 보여준다", async () => {
    listCategoriesWithAccountsMock.mockResolvedValue([
      {
        id: "cat-1",
        name: "업무",
        accounts: [
          {
            id: "acc-1",
            name: "사내 관리자",
            url: "https://admin.example.com",
            username: "admin",
            password: "secret1",
            memo: null,
          },
        ],
      },
    ]);

    await renderAccountsPage();

    expect(screen.getByText("사내 관리자")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "https://admin.example.com" })).toHaveAttribute(
      "href",
      "https://admin.example.com"
    );
    expect(screen.getByRole("button", { name: "admin" })).toBeInTheDocument();
  });

  it("조회가 실패하면 안내 문구를 보여준다", async () => {
    listCategoriesWithAccountsMock.mockRejectedValue(new Error("db down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderAccountsPage();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();

    expect(
      screen.getByText(
        "계정 정보를 불러오지 못했습니다. Supabase 연결 상태와 0003_accounts.sql 마이그레이션 실행 여부를 확인해주세요."
      )
    ).toBeInTheDocument();
  });
});
