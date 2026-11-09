export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { withRetry } from "@/lib/supabase/withRetry";
import { listCategoriesWithAccounts } from "@/lib/accounts/accountsStore";
import { listCategoriesWithFavorites } from "@/lib/favorites/favoritesStore";
import type { SiteCategory, SiteItem } from "@/lib/sites/merge";
import { SitesPreview } from "./SitesPreview";

export default async function SitesPage() {
  let accounts;
  let favorites;

  try {
    [accounts, favorites] = await Promise.all([
      withRetry(() => listCategoriesWithAccounts(), "sites/accounts"),
      withRetry(() => listCategoriesWithFavorites(), "sites/favorites"),
    ]);
  } catch (error) {
    console.error("[sites] 조회 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] py-6">
          <h1 className="text-lg font-semibold text-foreground">어카운트·북마크</h1>
          <p className="mt-6 text-sm text-muted">계정관리·즐겨찾기 데이터를 불러오지 못했습니다.</p>
        </main>
      </div>
    );
  }

  // 계정과 즐겨찾기는 화면에서 영역을 나눠 보여주므로 같은 주소가 양쪽에 있어도 합치지 않는다.
  const items: SiteItem[] = [
    ...accounts.flatMap((category) =>
      category.accounts.map((a) => ({
        id: `a-${a.id}`,
        rawId: a.id,
        categoryId: category.id,
        source: "account" as const,
        name: a.name,
        url: a.url,
        username: a.username || null,
        password: a.password || null,
        memo: a.memo,
        originalCategory: category.name,
      }))
    ),
    ...favorites.flatMap((category) =>
      category.favorites.map((f) => ({
        id: `f-${f.id}`,
        rawId: f.id,
        categoryId: category.id,
        source: "favorite" as const,
        name: f.name,
        url: f.url,
        username: null,
        password: null,
        memo: null,
        originalCategory: category.name,
      }))
    ),
  ];

  const categories: SiteCategory[] = [
    ...accounts.map((c) => ({ id: c.id, name: c.name, source: "account" as const })),
    ...favorites.map((c) => ({ id: c.id, name: c.name, source: "favorite" as const })),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] py-6">
        <h1 className="text-lg font-semibold text-foreground">어카운트·북마크</h1>

        <SitesPreview items={items} categories={categories} />
      </main>
    </div>
  );
}
