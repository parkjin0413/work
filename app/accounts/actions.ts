"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  createAccount,
  renameAccount,
  deleteAccount,
} from "@/lib/accounts/accountsStore";

export async function createCategoryAction(name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("카테고리 이름을 입력해주세요.");
  }

  await createCategory(name.trim());
  revalidatePath("/accounts");
}

export async function renameCategoryAction(id: string, name: string): Promise<void> {
  await requireAdmin();

  if (!name.trim()) {
    throw new Error("카테고리 이름을 입력해주세요.");
  }

  await renameCategory(id, name.trim());
  revalidatePath("/accounts");
}

export async function deleteCategoryAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteCategory(id);
  revalidatePath("/accounts");
}

export async function createAccountAction(params: {
  categoryId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("계정명을 입력해주세요.");
  }
  if (!params.username.trim()) {
    throw new Error("아이디를 입력해주세요.");
  }
  if (!params.password.trim()) {
    throw new Error("비밀번호를 입력해주세요.");
  }

  await createAccount({
    categoryId: params.categoryId,
    name: params.name.trim(),
    url: params.url.trim(),
    username: params.username.trim(),
    password: params.password,
    memo: params.memo.trim() || null,
  });
  revalidatePath("/accounts");
}

export async function renameAccountAction(params: {
  id: string;
  categoryId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.name.trim()) {
    throw new Error("계정명을 입력해주세요.");
  }
  if (!params.username.trim()) {
    throw new Error("아이디를 입력해주세요.");
  }
  if (!params.password.trim()) {
    throw new Error("비밀번호를 입력해주세요.");
  }

  await renameAccount(params.id, {
    categoryId: params.categoryId,
    name: params.name.trim(),
    url: params.url.trim(),
    username: params.username.trim(),
    password: params.password,
    memo: params.memo.trim() || null,
  });
  revalidatePath("/accounts");
}

export async function deleteAccountAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteAccount(id);
  revalidatePath("/accounts");
}
