export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listCategoriesWithFavorites } from "@/lib/favorites/favoritesStore";
import { CreateCategoryForm } from "./CreateCategoryForm";
import { CreateFavoriteForm } from "./CreateFavoriteForm";
import { CategoryRowActions } from "./CategoryRowActions";
import { FavoriteRowActions } from "./FavoriteRowActions";

export default async function FavoritesPage() {
  const categories = await listCategoriesWithFavorites();

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">즐겨찾기</h1>

        <CreateCategoryForm />

        {categories.length === 0 ? (
          <p className="mt-6 text-sm text-muted">카테고리를 먼저 만들어주세요.</p>
        ) : (
          <div className="mt-6 space-y-6">
            {categories.map((category) => (
              <section key={category.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
                  <CategoryRowActions categoryId={category.id} currentName={category.name} />
                </div>

                <CreateFavoriteForm categoryId={category.id} />

                {category.favorites.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">즐겨찾기가 없습니다.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-border">
                    {category.favorites.map((favorite) => (
                      <li key={favorite.id} className="flex items-center justify-between py-2">
                        <a
                          href={favorite.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {favorite.name}
                        </a>
                        <FavoriteRowActions
                          favoriteId={favorite.id}
                          currentName={favorite.name}
                          currentUrl={favorite.url}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
