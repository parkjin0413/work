export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listCategoriesWithFavorites, type CategoryWithFavorites } from "@/lib/favorites/favoritesStore";
import { CreateCategoryForm } from "./CreateCategoryForm";
import { FavoritesBoard } from "./FavoritesBoard";

export default async function FavoritesPage() {
  let categories: CategoryWithFavorites[];

  try {
    categories = await listCategoriesWithFavorites();
  } catch (error) {
    console.error("[favorites] listCategoriesWithFavorites 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">즐겨찾기</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              즐겨찾기를 불러오지 못했습니다. Supabase 연결 상태와
              0002_favorites.sql 마이그레이션 실행 여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">즐겨찾기</h1>

        <CreateCategoryForm />

        {categories.length === 0 ? (
          <p className="mt-6 text-sm text-muted">카테고리를 먼저 만들어주세요.</p>
        ) : (
          <FavoritesBoard categories={categories} />
        )}
      </main>
    </div>
  );
}
