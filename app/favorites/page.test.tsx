import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import FavoritesPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/favorites",
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { listCategoriesWithFavoritesMock } = vi.hoisted(() => ({
  listCategoriesWithFavoritesMock: vi.fn(),
}));

vi.mock("@/lib/favorites/favoritesStore", () => ({
  listCategoriesWithFavorites: listCategoriesWithFavoritesMock,
}));

async function renderFavoritesPage() {
  const element = await FavoritesPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("FavoritesPage", () => {
  beforeEach(() => {
    listCategoriesWithFavoritesMock.mockReset();
  });

  it("카테고리가 없으면 안내 문구를 보여준다", async () => {
    listCategoriesWithFavoritesMock.mockResolvedValue([]);

    await renderFavoritesPage();

    expect(screen.getByText("카테고리를 먼저 만들어주세요.")).toBeInTheDocument();
  });

  it("즐겨찾기가 없는 카테고리는 안내 문구를 보여준다", async () => {
    listCategoriesWithFavoritesMock.mockResolvedValue([
      { id: "cat-1", name: "업무", favorites: [] },
    ]);

    await renderFavoritesPage();

    expect(screen.getByText("업무")).toBeInTheDocument();
    expect(screen.getByText("즐겨찾기가 없습니다.")).toBeInTheDocument();
  });

  it("카테고리별 즐겨찾기 목록을 보여준다", async () => {
    listCategoriesWithFavoritesMock.mockResolvedValue([
      {
        id: "cat-1",
        name: "업무",
        favorites: [{ id: "fav-1", name: "사내 위키", url: "https://wiki.example.com" }],
      },
    ]);

    await renderFavoritesPage();

    expect(screen.getByText("업무")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "사내 위키" })).toHaveAttribute(
      "href",
      "https://wiki.example.com"
    );
    expect(screen.getByRole("link", { name: "사내 위키" })).toHaveAttribute("target", "_blank");
  });
});
