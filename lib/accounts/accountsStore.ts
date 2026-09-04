import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { encryptToken, decryptToken } from "@/lib/crypto/tokenCipher";

export type CategoryOption = {
  id: string;
  name: string;
};

export type BoardAccount = {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string | null;
  categoryId: string;
  categoryName: string;
};

export type AccountsBoardData = {
  categories: CategoryOption[];
  accounts: BoardAccount[];
};

function assertValidUrl(url: string): void {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
  }
}

export async function listAccountsBoard(): Promise<AccountsBoardData> {
  const supabase = createSupabaseServiceClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("account_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    throw new Error(`카테고리 조회 실패: ${categoriesError.message}`);
  }

  const { data: accounts, error: accountsError } = await supabase
    .from("accounts")
    .select("id, name, url, username, password_encrypted, memo, category_id")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (accountsError) {
    throw new Error(`계정 조회 실패: ${accountsError.message}`);
  }

  const categoryNameById = new Map((categories ?? []).map((category) => [category.id, category.name]));

  return {
    categories: (categories ?? []).map((category) => ({ id: category.id, name: category.name })),
    accounts: (accounts ?? []).map((account) => ({
      id: account.id,
      name: account.name,
      url: account.url,
      username: account.username,
      password: decryptToken(account.password_encrypted),
      memo: account.memo,
      categoryId: account.category_id,
      categoryName: categoryNameById.get(account.category_id) ?? "",
    })),
  };
}

export async function createCategory(name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("account_categories").insert({ name });

  if (error) {
    throw new Error(`카테고리 생성 실패: ${error.message}`);
  }
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("account_categories").update({ name }).eq("id", id);

  if (error) {
    throw new Error(`카테고리 이름 변경 실패: ${error.message}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("account_categories").delete().eq("id", id);

  if (error) {
    throw new Error(`카테고리 삭제 실패: ${error.message}`);
  }
}

export async function createAccount(input: {
  categoryId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string | null;
}): Promise<void> {
  assertValidUrl(input.url);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("accounts").insert({
    category_id: input.categoryId,
    name: input.name,
    url: input.url,
    username: input.username,
    password_encrypted: encryptToken(input.password),
    memo: input.memo,
  });

  if (error) {
    throw new Error(`계정 생성 실패: ${error.message}`);
  }
}

export async function renameAccount(
  id: string,
  input: {
    categoryId: string;
    name: string;
    url: string;
    username: string;
    password: string;
    memo: string | null;
  }
): Promise<void> {
  assertValidUrl(input.url);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("accounts")
    .update({
      category_id: input.categoryId,
      name: input.name,
      url: input.url,
      username: input.username,
      password_encrypted: encryptToken(input.password),
      memo: input.memo,
    })
    .eq("id", id);

  if (error) {
    throw new Error(`계정 수정 실패: ${error.message}`);
  }
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);

  if (error) {
    throw new Error(`계정 삭제 실패: ${error.message}`);
  }
}

export async function reorderAccounts(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("accounts").update({ sort_order: index }).eq("id", id))
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`계정 순서 변경 실패: ${failed.error.message}`);
  }
}
