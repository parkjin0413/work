import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

export type FavoriteSummary = {
  id: string;
  name: string;
  url: string;
};

export type CategoryWithFavorites = {
  id: string;
  name: string;
  favorites: FavoriteSummary[];
};

function assertValidUrl(url: string): void {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
  }
}

export async function listCategoriesWithFavorites(): Promise<CategoryWithFavorites[]> {
  const supabase = createSupabaseServiceClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("favorite_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    throw new Error(`카테고리 조회 실패: ${categoriesError.message}`);
  }

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorites")
    .select("id, name, url, category_id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (favoritesError) {
    throw new Error(`즐겨찾기 조회 실패: ${favoritesError.message}`);
  }

  return (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    favorites: (favorites ?? [])
      .filter((favorite) => favorite.category_id === category.id)
      .map((favorite) => ({ id: favorite.id, name: favorite.name, url: favorite.url })),
  }));
}

export async function createCategory(name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("favorite_categories").insert({ name });

  if (error) {
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("favorite_categories").update({ sort_order: index }).eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`카테고리 순서 변경 실패: ${failed.error.message}`);
  }
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("favorite_categories").update({ name }).eq("id", id);

  if (error) {
    throw new Error(`카테고리 이름 변경 실패: ${error.message}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("favorite_categories").delete().eq("id", id);

  if (error) {
    throw new Error(`카테고리 삭제 실패: ${error.message}`);
  }
}

export async function createFavorite(input: {
  categoryId: string;
  name: string;
  url: string;
}): Promise<void> {
  assertValidUrl(input.url);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("favorites").insert({
    category_id: input.categoryId,
    name: input.name,
    url: input.url,
  });

  if (error) {
    throw new Error(`즐겨찾기 생성 실패: ${error.message}`);
  }
}

export async function reorderFavorites(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("favorites").update({ sort_order: index }).eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`즐겨찾기 순서 변경 실패: ${failed.error.message}`);
  }
}

export async function renameFavorite(
  id: string,
  input: { name: string; url: string }
): Promise<void> {
  assertValidUrl(input.url);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("favorites")
    .update({ name: input.name, url: input.url })
    .eq("id", id);

  if (error) {
    throw new Error(`즐겨찾기 수정 실패: ${error.message}`);
  }
}

export async function deleteFavorite(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("favorites").delete().eq("id", id);

  if (error) {
    throw new Error(`즐겨찾기 삭제 실패: ${error.message}`);
  }
}
