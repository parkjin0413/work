import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { encryptToken, decryptToken } from "@/lib/crypto/tokenCipher";
import { isMissingColumnError } from "@/lib/supabase/missingColumn";
import { getKstTodayISO } from "@/lib/tasks/week";

export type AccountSummary = {
  id: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string | null;
  /** 어카운트 맨 위 "고정"에 보일지 (0026 전에는 늘 false) */
  pinned: boolean;
  /** 비밀번호를 마지막으로 바꾼 날 (0026 이후 바꾼 것만 기록됨) */
  passwordChangedAt: string | null;
  /** "고정" 영역 안의 순서 (0027 전이거나 아직 안 옮겼으면 null) */
  pinOrder: number | null;
};

export type CategoryWithAccounts = {
  id: string;
  name: string;
  accounts: AccountSummary[];
};

function assertValidUrl(url: string): void {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
  }
}

export async function listCategoriesWithAccounts(): Promise<CategoryWithAccounts[]> {
  const supabase = createSupabaseServiceClient();

  const { data: categories, error: categoriesError } = await supabase
    .from("account_categories")
    .select("id, name")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    throw new Error(`카테고리 조회 실패: ${categoriesError.message}`);
  }

  const query = (columns: string) =>
    supabase
      .from("accounts")
      .select(columns)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
  type AccountRow = {
    id: string;
    name: string;
    url: string;
    username: string;
    password_encrypted: string;
    memo: string | null;
    category_id: string;
    pinned?: boolean;
    password_changed_at?: string | null;
    pin_order?: number | null;
  };
  const BASE = "id, name, url, username, password_encrypted, memo, category_id";
  // 0027(고정 순서)·0026(고정·변경일) 실행 전이면 있는 열만 읽는다.
  let { data, error: accountsError } = await query(`${BASE}, pinned, password_changed_at, pin_order`);
  if (isMissingColumnError(accountsError))
    ({ data, error: accountsError } = await query(`${BASE}, pinned, password_changed_at`));
  if (isMissingColumnError(accountsError)) ({ data, error: accountsError } = await query(BASE));
  const accounts = data as unknown as AccountRow[] | null;

  if (accountsError) {
    throw new Error(`계정 조회 실패: ${accountsError.message}`);
  }

  return (categories ?? []).map((category) => ({
    id: category.id,
    name: category.name,
    accounts: (accounts ?? [])
      .filter((account) => account.category_id === category.id)
      .map((account) => ({
        id: account.id,
        name: account.name,
        url: account.url,
        username: account.username,
        password: decryptToken(account.password_encrypted),
        memo: account.memo,
        pinned: account.pinned ?? false,
        passwordChangedAt: account.password_changed_at ?? null,
        pinOrder: account.pin_order ?? null,
      })),
  }));
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
  const row = {
    category_id: input.categoryId,
    name: input.name,
    url: input.url,
    username: input.username,
    password_encrypted: encryptToken(input.password),
    memo: input.memo,
  };
  let { error } = await supabase.from("accounts").insert({ ...row, password_changed_at: getKstTodayISO() });
  if (isMissingColumnError(error)) ({ error } = await supabase.from("accounts").insert(row));

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
  // 비밀번호가 실제로 바뀌었을 때만 변경일을 오늘로 남긴다.
  const { data: existing } = await supabase.from("accounts").select("password_encrypted").eq("id", id).maybeSingle();
  let changed = true;
  try {
    changed = !existing || decryptToken(existing.password_encrypted) !== input.password;
  } catch {
    changed = true;
  }
  const row = {
    category_id: input.categoryId,
    name: input.name,
    url: input.url,
    username: input.username,
    password_encrypted: encryptToken(input.password),
    memo: input.memo,
  };
  let { error } = await supabase
    .from("accounts")
    .update(changed ? { ...row, password_changed_at: getKstTodayISO() } : row)
    .eq("id", id);
  if (changed && isMissingColumnError(error)) ({ error } = await supabase.from("accounts").update(row).eq("id", id));

  if (error) {
    throw new Error(`계정 수정 실패: ${error.message}`);
  }
}

/** 어카운트 맨 위 "고정"에 올리거나 내린다. 0026 전이면 안내 문구로 실패한다. */
export async function setAccountPinned(id: string, pinned: boolean): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("accounts").update({ pinned }).eq("id", id);
  if (isMissingColumnError(error)) throw new Error("고정하려면 0026_account_pins.sql 을 먼저 실행해주세요.");
  if (error) throw new Error(`고정 변경 실패: ${error.message}`);
}

/** 고정 해제할 때는 순서도 지운다 (다시 고정하면 맨 뒤로) */
export async function setAccountPinOrder(id: string, pinOrder: number | null): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("accounts").update({ pin_order: pinOrder }).eq("id", id);
  if (isMissingColumnError(error)) throw new Error("고정 순서를 바꾸려면 0027_pin_order.sql 을 먼저 실행해주세요.");
  if (error) throw new Error(`고정 순서 변경 실패: ${error.message}`);
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

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("account_categories").update({ sort_order: index }).eq("id", id)
    )
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`카테고리 순서 변경 실패: ${failed.error.message}`);
  }
}
