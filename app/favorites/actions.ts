"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  createFavorite,
  renameFavorite,
  deleteFavorite,
} from "@/lib/favorites/favoritesStore";

export async function createCategoryAction(name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("카테고리 이름을 입력해주세요.");
  }

  await createCategory(name.trim());
  revalidatePath("/favorites");
}

export async function renameCategoryAction(id: string, name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("카테고리 이름을 입력해주세요.");
  }

  await renameCategory(id, name.trim());
  revalidatePath("/favorites");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteCategory(id);
  revalidatePath("/favorites");
}

export async function createFavoriteAction(params: {
  categoryId: string;
  name: string;
  url: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await createFavorite({
    categoryId: params.categoryId,
    name: params.name.trim(),
    url: params.url.trim(),
  });
  revalidatePath("/favorites");
}

export async function renameFavoriteAction(params: {
  id: string;
  name: string;
  url: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await renameFavorite(params.id, { name: params.name.trim(), url: params.url.trim() });
  revalidatePath("/favorites");
}

export async function deleteFavoriteAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteFavorite(id);
  revalidatePath("/favorites");
}
