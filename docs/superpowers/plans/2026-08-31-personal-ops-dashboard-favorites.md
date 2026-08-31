# URL 즐겨찾기 기능 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 카테고리별로 URL 즐겨찾기를 저장·관리할 수 있는 `/favorites` 페이지를 만들고, 사이드바에 5번째 메뉴로 연결한다.

**Architecture:** Supabase에 `favorite_categories`/`favorites` 2개 테이블을 새로 만들고(이 프로젝트 최초의 "우리 서비스가 직접 저장하는 데이터" — 기존엔 OAuth 토큰만 저장했음), `oauth_tokens`와 동일한 서비스 롤 전용 접근 패턴을 그대로 따른다. Notion 연동(데이터베이스→아이템 2단 구조, Server Action 기반 CRUD, 카드/폼 컴포넌트)과 동일한 코드 패턴을 재사용한다.

**Tech Stack:** 기존 스택 재사용 (신규 의존성 없음, `lucide-react`의 `Star` 아이콘만 추가로 사용)

**Spec:** [docs/superpowers/specs/2026-08-31-personal-ops-dashboard-favorites-design.md](../specs/2026-08-31-personal-ops-dashboard-favorites-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다.
- `/favorites` 페이지는 라이브 데이터를 읽으므로 `export const dynamic = "force-dynamic"`을 명시한다.
- 모든 mutating Server Action은 `await requireAdmin()`을 첫 줄에서 호출한다.
- 색상은 반드시 시맨틱 토큰 클래스(`bg-bg`, `bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `hover:bg-accent-hover`, `text-accent-foreground`, `bg-danger`가 아닌 `border-danger`/`text-danger`)만 사용한다 — raw Tailwind 팔레트 클래스는 쓰지 않는다.
- URL은 저장/수정 전 `http://` 또는 `https://`로 시작하는지 검증하고, 아니면 에러를 던진다.
- 카테고리 삭제는 `on delete cascade`로 안의 즐겨찾기도 함께 삭제되므로, 관리 화면에서 `window.confirm`으로 먼저 확인한다.
- `favorite_categories`/`favorites` 테이블은 RLS를 켜두되 정책은 부여하지 않는다 — 서버(서비스 역할 키)에서만 접근 가능 (`oauth_tokens` 테이블과 동일한 보안 모델).
- 즐겨찾기 링크는 `target="_blank" rel="noopener noreferrer"`로 새 탭에 연다.

---

### Task 1: 데이터 마이그레이션 & favoritesStore.ts

**Files:**
- Create: `supabase/migrations/0002_favorites.sql`
- Create: `lib/favorites/favoritesStore.ts`
- Test: `lib/favorites/favoritesStore.test.ts`

**Interfaces:**
- Consumes: `@/lib/supabase/serviceClient`의 `createSupabaseServiceClient()`
- Produces: `type FavoriteSummary = { id: string; name: string; url: string }`, `type CategoryWithFavorites = { id: string; name: string; favorites: FavoriteSummary[] }`, `listCategoriesWithFavorites(): Promise<CategoryWithFavorites[]>`, `createCategory(name: string): Promise<void>`, `renameCategory(id: string, name: string): Promise<void>`, `deleteCategory(id: string): Promise<void>`, `createFavorite(input: { categoryId: string; name: string; url: string }): Promise<void>`, `renameFavorite(id: string, input: { name: string; url: string }): Promise<void>`, `deleteFavorite(id: string): Promise<void>` — 전부 `lib/favorites/favoritesStore.ts`. Task 2가 이 타입/함수를 그대로 사용한다.

- [ ] **Step 1: 마이그레이션 SQL 작성**

`supabase/migrations/0002_favorites.sql`:
```sql
create table favorite_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table favorites (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references favorite_categories(id) on delete cascade,
  name text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table favorite_categories enable row level security;
alter table favorites enable row level security;

-- 이 두 테이블은 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/favorites/favoritesStore.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const orderMock = vi.fn();
const selectMock = vi.fn(() => ({ order: orderMock }));
const insertMock = vi.fn();
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const deleteEqMock = vi.fn();
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const fromMock = vi.fn(() => ({
  select: selectMock,
  insert: insertMock,
  update: updateMock,
  delete: deleteMock,
}));

vi.mock("@/lib/supabase/serviceClient", () => ({
  createSupabaseServiceClient: () => ({ from: fromMock }),
}));

import {
  listCategoriesWithFavorites,
  createCategory,
  renameCategory,
  deleteCategory,
  createFavorite,
  renameFavorite,
  deleteFavorite,
} from "./favoritesStore";

describe("favoritesStore", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    orderMock.mockReset();
    insertMock.mockReset();
    updateMock.mockClear();
    eqMock.mockReset();
    deleteMock.mockClear();
    deleteEqMock.mockReset();
  });

  describe("listCategoriesWithFavorites", () => {
    it("카테고리별로 즐겨찾기를 묶어서 반환한다", async () => {
      orderMock
        .mockResolvedValueOnce({
          data: [
            { id: "cat-1", name: "업무" },
            { id: "cat-2", name: "개인" },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: "fav-1", name: "사내 위키", url: "https://wiki.example.com", category_id: "cat-1" },
            { id: "fav-2", name: "블로그", url: "https://blog.example.com", category_id: "cat-2" },
          ],
          error: null,
        });

      const result = await listCategoriesWithFavorites();

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(result).toEqual([
        {
          id: "cat-1",
          name: "업무",
          favorites: [{ id: "fav-1", name: "사내 위키", url: "https://wiki.example.com" }],
        },
        {
          id: "cat-2",
          name: "개인",
          favorites: [{ id: "fav-2", name: "블로그", url: "https://blog.example.com" }],
        },
      ]);
    });

    it("카테고리 조회가 실패하면 에러를 던진다", async () => {
      orderMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });

      await expect(listCategoriesWithFavorites()).rejects.toThrow("db down");
    });
  });

  describe("createCategory", () => {
    it("카테고리를 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createCategory("업무");

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(insertMock).toHaveBeenCalledWith({ name: "업무" });
    });

    it("생성이 실패하면 에러를 던진다", async () => {
      insertMock.mockResolvedValue({ error: { message: "db down" } });

      await expect(createCategory("업무")).rejects.toThrow("db down");
    });
  });

  describe("renameCategory", () => {
    it("카테고리 이름을 변경한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await renameCategory("cat-1", "새 이름");

      expect(updateMock).toHaveBeenCalledWith({ name: "새 이름" });
      expect(eqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  describe("deleteCategory", () => {
    it("카테고리를 삭제한다", async () => {
      deleteEqMock.mockResolvedValue({ error: null });

      await deleteCategory("cat-1");

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  describe("createFavorite", () => {
    it("올바른 URL이면 즐겨찾기를 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createFavorite({ categoryId: "cat-1", name: "사내 위키", url: "https://wiki.example.com" });

      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(insertMock).toHaveBeenCalledWith({
        category_id: "cat-1",
        name: "사내 위키",
        url: "https://wiki.example.com",
      });
    });

    it("http/https로 시작하지 않는 URL은 거부한다", async () => {
      await expect(
        createFavorite({ categoryId: "cat-1", name: "위험", url: "javascript:alert(1)" })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe("renameFavorite", () => {
    it("이름과 URL을 수정한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await renameFavorite("fav-1", { name: "새 이름", url: "https://new.example.com" });

      expect(updateMock).toHaveBeenCalledWith({ name: "새 이름", url: "https://new.example.com" });
      expect(eqMock).toHaveBeenCalledWith("id", "fav-1");
    });

    it("잘못된 URL이면 거부한다", async () => {
      await expect(
        renameFavorite("fav-1", { name: "이름", url: "not-a-url" })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
    });
  });

  describe("deleteFavorite", () => {
    it("즐겨찾기를 삭제한다", async () => {
      deleteEqMock.mockResolvedValue({ error: null });

      await deleteFavorite("fav-1");

      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "fav-1");
    });
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/favorites/favoritesStore.test.ts`
Expected: FAIL — `./favoritesStore` 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`lib/favorites/favoritesStore.ts`:
```ts
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
    .order("created_at", { ascending: true });

  if (categoriesError) {
    throw new Error(`카테고리 조회 실패: ${categoriesError.message}`);
  }

  const { data: favorites, error: favoritesError } = await supabase
    .from("favorites")
    .select("id, name, url, category_id")
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/favorites/favoritesStore.test.ts`
Expected: PASS (11개 테스트 모두 통과)

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/0002_favorites.sql lib/favorites/favoritesStore.ts lib/favorites/favoritesStore.test.ts
git commit -m "feat: 즐겨찾기 데이터 테이블과 CRUD 함수 추가"
```

---

### Task 2: Server Actions

**Files:**
- Create: `app/favorites/actions.ts`
- Test: `app/favorites/actions.test.ts`

**Interfaces:**
- Consumes: Task 1의 `createCategory`, `renameCategory`, `deleteCategory`, `createFavorite`, `renameFavorite`, `deleteFavorite`
- Produces: `createCategoryAction(name: string): Promise<void>`, `renameCategoryAction(id: string, name: string): Promise<void>`, `deleteCategoryAction(id: string): Promise<void>`, `createFavoriteAction(params: { categoryId: string; name: string; url: string }): Promise<void>`, `renameFavoriteAction(params: { id: string; name: string; url: string }): Promise<void>`, `deleteFavoriteAction(id: string): Promise<void>` — 전부 `app/favorites/actions.ts`. Task 3이 이 액션들을 그대로 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/favorites/actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createFavorite: vi.fn(),
    renameFavorite: vi.fn(),
    deleteFavorite: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/favorites/favoritesStore", () => storeMock);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  createFavoriteAction,
  renameFavoriteAction,
  deleteFavoriteAction,
} from "./actions";

function resetAll() {
  requireAdminMock.mockReset();
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
  requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
}

describe("createCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.createCategory.mockResolvedValue(undefined);
    await createCategoryAction("업무");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(createCategoryAction("업무")).rejects.toThrow();
    expect(storeMock.createCategory).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 createCategory를 호출하지 않는다", async () => {
    await expect(createCategoryAction("   ")).rejects.toThrow("카테고리 이름을 입력해주세요.");
    expect(storeMock.createCategory).not.toHaveBeenCalled();
  });

  it("정상 생성은 createCategory와 revalidatePath를 호출한다", async () => {
    storeMock.createCategory.mockResolvedValue(undefined);
    await createCategoryAction("업무");
    expect(storeMock.createCategory).toHaveBeenCalledWith("업무");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("renameCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.renameCategory.mockResolvedValue(undefined);
    await renameCategoryAction("cat-1", "새 이름");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(renameCategoryAction("cat-1", "새 이름")).rejects.toThrow();
    expect(storeMock.renameCategory).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 renameCategory를 호출하지 않는다", async () => {
    await expect(renameCategoryAction("cat-1", "  ")).rejects.toThrow("카테고리 이름을 입력해주세요.");
    expect(storeMock.renameCategory).not.toHaveBeenCalled();
  });

  it("정상 변경은 renameCategory와 revalidatePath를 호출한다", async () => {
    storeMock.renameCategory.mockResolvedValue(undefined);
    await renameCategoryAction("cat-1", "새 이름");
    expect(storeMock.renameCategory).toHaveBeenCalledWith("cat-1", "새 이름");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("deleteCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.deleteCategory.mockResolvedValue(undefined);
    await deleteCategoryAction("cat-1");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 deleteCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteCategoryAction("cat-1")).rejects.toThrow();
    expect(storeMock.deleteCategory).not.toHaveBeenCalled();
  });

  it("정상 삭제는 deleteCategory와 revalidatePath를 호출한다", async () => {
    storeMock.deleteCategory.mockResolvedValue(undefined);
    await deleteCategoryAction("cat-1");
    expect(storeMock.deleteCategory).toHaveBeenCalledWith("cat-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("createFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.createFavorite.mockResolvedValue(undefined);
    await createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" });
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" })
    ).rejects.toThrow();
    expect(storeMock.createFavorite).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 createFavorite를 호출하지 않는다", async () => {
    await expect(
      createFavoriteAction({ categoryId: "cat-1", name: "  ", url: "https://wiki.example.com" })
    ).rejects.toThrow("이름을 입력해주세요.");
    expect(storeMock.createFavorite).not.toHaveBeenCalled();
  });

  it("정상 생성은 createFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.createFavorite.mockResolvedValue(undefined);
    await createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" });
    expect(storeMock.createFavorite).toHaveBeenCalledWith({
      categoryId: "cat-1",
      name: "위키",
      url: "https://wiki.example.com",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("renameFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.renameFavorite.mockResolvedValue(undefined);
    await renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" });
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" })
    ).rejects.toThrow();
    expect(storeMock.renameFavorite).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 renameFavorite를 호출하지 않는다", async () => {
    await expect(
      renameFavoriteAction({ id: "fav-1", name: "   ", url: "https://new.example.com" })
    ).rejects.toThrow("이름을 입력해주세요.");
    expect(storeMock.renameFavorite).not.toHaveBeenCalled();
  });

  it("정상 변경은 renameFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.renameFavorite.mockResolvedValue(undefined);
    await renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" });
    expect(storeMock.renameFavorite).toHaveBeenCalledWith("fav-1", {
      name: "새 이름",
      url: "https://new.example.com",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("deleteFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.deleteFavorite.mockResolvedValue(undefined);
    await deleteFavoriteAction("fav-1");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 deleteFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteFavoriteAction("fav-1")).rejects.toThrow();
    expect(storeMock.deleteFavorite).not.toHaveBeenCalled();
  });

  it("정상 삭제는 deleteFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.deleteFavorite.mockResolvedValue(undefined);
    await deleteFavoriteAction("fav-1");
    expect(storeMock.deleteFavorite).toHaveBeenCalledWith("fav-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/favorites/actions.test.ts`
Expected: FAIL — `./actions` 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

`app/favorites/actions.ts`:
```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/favorites/actions.test.ts`
Expected: PASS (22개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add app/favorites/actions.ts app/favorites/actions.test.ts
git commit -m "feat: 즐겨찾기 Server Action 추가"
```

---

### Task 3: 관리 페이지 & 폼/액션 컴포넌트

**Files:**
- Create: `app/favorites/page.tsx`
- Test: `app/favorites/page.test.tsx`
- Create: `app/favorites/CreateCategoryForm.tsx`
- Test: `app/favorites/CreateCategoryForm.test.tsx`
- Create: `app/favorites/CreateFavoriteForm.tsx`
- Test: `app/favorites/CreateFavoriteForm.test.tsx`
- Create: `app/favorites/CategoryRowActions.tsx`
- Test: `app/favorites/CategoryRowActions.test.tsx`
- Create: `app/favorites/FavoriteRowActions.tsx`
- Test: `app/favorites/FavoriteRowActions.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `listCategoriesWithFavorites`, `type CategoryWithFavorites`. Task 2의 6개 Server Action.
- Produces: 없음 (Task 4가 Sidebar만 건드리며 이 페이지들을 import하지 않는다 — 링크로만 연결)

페이지와 4개 컴포넌트가 서로 강하게 얽혀 있어(페이지가 4개 컴포넌트를 전부 사용) 한 태스크로 묶는다.

- [ ] **Step 1: 실패하는 테스트 작성 — 페이지**

`app/favorites/page.test.tsx`:
```tsx
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/favorites/page.test.tsx`
Expected: FAIL — `./page` 모듈 없음.

- [ ] **Step 3: 나머지 4개 컴포넌트의 실패하는 테스트 작성**

`app/favorites/CreateCategoryForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateCategoryForm } from "./CreateCategoryForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createCategoryActionMock } = vi.hoisted(() => ({
  createCategoryActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createCategoryAction: createCategoryActionMock,
}));

describe("CreateCategoryForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createCategoryActionMock.mockReset();
  });

  it("이름을 입력하고 제출하면 카테고리를 생성한다", async () => {
    createCategoryActionMock.mockResolvedValue(undefined);
    render(<CreateCategoryForm />);

    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "업무" } });
    fireEvent.click(screen.getByRole("button", { name: "새 카테고리 추가" }));

    await waitFor(() => expect(createCategoryActionMock).toHaveBeenCalledWith("업무"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("생성에 실패하면 한글 에러 메시지를 보여준다", async () => {
    createCategoryActionMock.mockRejectedValue(new Error("failed"));
    render(<CreateCategoryForm />);

    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "업무" } });
    fireEvent.click(screen.getByRole("button", { name: "새 카테고리 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("카테고리 생성에 실패했습니다.");
  });

  it("이름이 비어있으면 제출 버튼이 비활성화된다", () => {
    render(<CreateCategoryForm />);

    expect(screen.getByRole("button", { name: "새 카테고리 추가" })).toBeDisabled();
  });
});
```

`app/favorites/CreateFavoriteForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateFavoriteForm } from "./CreateFavoriteForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createFavoriteActionMock } = vi.hoisted(() => ({
  createFavoriteActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createFavoriteAction: createFavoriteActionMock,
}));

describe("CreateFavoriteForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createFavoriteActionMock.mockReset();
  });

  it("이름과 URL을 입력하고 제출하면 즐겨찾기를 생성한다", async () => {
    createFavoriteActionMock.mockResolvedValue(undefined);
    render(<CreateFavoriteForm categoryId="cat-1" />);

    fireEvent.change(screen.getByLabelText("새 즐겨찾기 이름"), { target: { value: "사내 위키" } });
    fireEvent.change(screen.getByLabelText("새 즐겨찾기 URL"), {
      target: { value: "https://wiki.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "즐겨찾기 추가" }));

    await waitFor(() =>
      expect(createFavoriteActionMock).toHaveBeenCalledWith({
        categoryId: "cat-1",
        name: "사내 위키",
        url: "https://wiki.example.com",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("생성에 실패하면 URL 형식 에러 메시지를 보여준다", async () => {
    createFavoriteActionMock.mockRejectedValue(new Error("failed"));
    render(<CreateFavoriteForm categoryId="cat-1" />);

    fireEvent.change(screen.getByLabelText("새 즐겨찾기 이름"), { target: { value: "위험" } });
    fireEvent.change(screen.getByLabelText("새 즐겨찾기 URL"), {
      target: { value: "javascript:alert(1)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "즐겨찾기 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)"
    );
  });

  it("이름이나 URL이 비어있으면 제출 버튼이 비활성화된다", () => {
    render(<CreateFavoriteForm categoryId="cat-1" />);

    expect(screen.getByRole("button", { name: "즐겨찾기 추가" })).toBeDisabled();
  });
});
```

`app/favorites/CategoryRowActions.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryRowActions } from "./CategoryRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameCategoryActionMock, deleteCategoryActionMock } = vi.hoisted(() => ({
  renameCategoryActionMock: vi.fn(),
  deleteCategoryActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameCategoryAction: renameCategoryActionMock,
  deleteCategoryAction: deleteCategoryActionMock,
}));

describe("CategoryRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameCategoryActionMock.mockReset();
    deleteCategoryActionMock.mockReset();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 이름을 변경한다", async () => {
    renameCategoryActionMock.mockResolvedValue(undefined);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.change(screen.getByLabelText("새 카테고리 이름"), { target: { value: "새 업무" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(renameCategoryActionMock).toHaveBeenCalledWith("cat-1", "새 업무"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제 버튼을 누르고 확인하면 카테고리를 삭제한다", async () => {
    deleteCategoryActionMock.mockResolvedValue(undefined);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteCategoryActionMock).toHaveBeenCalledWith("cat-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("확인창에서 취소하면 삭제하지 않는다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CategoryRowActions categoryId="cat-1" currentName="업무" />);

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(deleteCategoryActionMock).not.toHaveBeenCalled();
  });
});
```

`app/favorites/FavoriteRowActions.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FavoriteRowActions } from "./FavoriteRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameFavoriteActionMock, deleteFavoriteActionMock } = vi.hoisted(() => ({
  renameFavoriteActionMock: vi.fn(),
  deleteFavoriteActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameFavoriteAction: renameFavoriteActionMock,
  deleteFavoriteAction: deleteFavoriteActionMock,
}));

describe("FavoriteRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameFavoriteActionMock.mockReset();
    deleteFavoriteActionMock.mockReset();
  });

  it("수정 버튼을 누르면 입력창이 나타나고 저장하면 이름과 URL을 변경한다", async () => {
    renameFavoriteActionMock.mockResolvedValue(undefined);
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("새 이름"), { target: { value: "새 위키" } });
    fireEvent.change(screen.getByLabelText("새 URL"), {
      target: { value: "https://new-wiki.example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameFavoriteActionMock).toHaveBeenCalledWith({
        id: "fav-1",
        name: "새 위키",
        url: "https://new-wiki.example.com",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("수정에 실패하면 URL 형식 에러 메시지를 보여준다", async () => {
    renameFavoriteActionMock.mockRejectedValue(new Error("failed"));
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)"
    );
  });

  it("삭제 버튼을 누르면 즐겨찾기를 삭제한다", async () => {
    deleteFavoriteActionMock.mockResolvedValue(undefined);
    render(
      <FavoriteRowActions
        favoriteId="fav-1"
        currentName="사내 위키"
        currentUrl="https://wiki.example.com"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(deleteFavoriteActionMock).toHaveBeenCalledWith("fav-1"));
    expect(refreshMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: 테스트 실패 확인**

Run: `npx vitest run app/favorites/CreateCategoryForm.test.tsx app/favorites/CreateFavoriteForm.test.tsx app/favorites/CategoryRowActions.test.tsx app/favorites/FavoriteRowActions.test.tsx`
Expected: FAIL — 4개 모듈 모두 없음.

- [ ] **Step 5: 페이지 구현**

`app/favorites/page.tsx`:
```tsx
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
```

- [ ] **Step 6: 나머지 4개 컴포넌트 구현**

`app/favorites/CreateCategoryForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createCategoryAction } from "./actions";

export function CreateCategoryForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createCategoryAction(name);
      setName("");
      router.refresh();
    } catch {
      setErrorMessage("카테고리 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="새 카테고리 이름"
        aria-label="새 카테고리 이름"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !name.trim()}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "새 카테고리 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
```

`app/favorites/CreateFavoriteForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createFavoriteAction } from "./actions";

export function CreateFavoriteForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !url.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createFavoriteAction({ categoryId, name, url });
      setName("");
      setUrl("");
      router.refresh();
    } catch {
      setErrorMessage("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        aria-label="새 즐겨찾기 이름"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        aria-label="새 즐겨찾기 URL"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !name.trim() || !url.trim()}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "즐겨찾기 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
```

`app/favorites/CategoryRowActions.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameCategoryAction, deleteCategoryAction } from "./actions";

export function CategoryRowActions({
  categoryId,
  currentName,
}: {
  categoryId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameCategoryAction(categoryId, newName);
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `"${currentName}" 카테고리를 삭제하면 안의 즐겨찾기도 함께 삭제됩니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteCategoryAction(categoryId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="새 카테고리 이름"
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newName.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
              setErrorMessage(null);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted"
        >
          이름변경
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-danger px-2 py-1 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
```

`app/favorites/FavoriteRowActions.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFavoriteAction, deleteFavoriteAction } from "./actions";

export function FavoriteRowActions({
  favoriteId,
  currentName,
  currentUrl,
}: {
  favoriteId: string;
  currentName: string;
  currentUrl: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [newUrl, setNewUrl] = useState(currentUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameFavoriteAction({ id: favoriteId, name: newName, url: newUrl });
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteFavoriteAction(favoriteId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="새 이름"
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            aria-label="새 URL"
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newName.trim() || !newUrl.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
              setNewUrl(currentUrl);
              setErrorMessage(null);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted"
        >
          수정
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-danger px-2 py-1 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run app/favorites/`
Expected: PASS (page 3개 + CreateCategoryForm 3개 + CreateFavoriteForm 3개 + CategoryRowActions 3개 + FavoriteRowActions 3개 = 15개 모두 통과)

- [ ] **Step 8: 커밋**

```bash
git add app/favorites/page.tsx app/favorites/page.test.tsx app/favorites/CreateCategoryForm.tsx app/favorites/CreateCategoryForm.test.tsx app/favorites/CreateFavoriteForm.tsx app/favorites/CreateFavoriteForm.test.tsx app/favorites/CategoryRowActions.tsx app/favorites/CategoryRowActions.test.tsx app/favorites/FavoriteRowActions.tsx app/favorites/FavoriteRowActions.test.tsx
git commit -m "feat: 즐겨찾기 관리 페이지와 폼/액션 컴포넌트 추가"
```

---

### Task 4: 사이드바 연동 + 문서 업데이트

**Files:**
- Modify: `components/layout/Sidebar.tsx`
- Modify: `components/layout/Sidebar.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음 (단순 링크 추가, `/favorites` 페이지를 import하지 않는다)
- Produces: 없음 (이 계획의 마지막 태스크)

- [ ] **Step 1: 실패하는 테스트 작성 — Sidebar 테스트 갱신**

`components/layout/Sidebar.test.tsx`의 "4개의 메뉴 링크를 올바른 경로로 보여준다" 테스트를 아래로 교체 (제목도 5개로 변경):
```tsx
  it("5개의 메뉴 링크를 올바른 경로로 보여준다", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Gmail" })).toHaveAttribute("href", "/gmail");
    expect(screen.getByRole("link", { name: "Drive" })).toHaveAttribute("href", "/drive");
    expect(screen.getByRole("link", { name: "Notion" })).toHaveAttribute("href", "/notion");
    expect(screen.getByRole("link", { name: "즐겨찾기" })).toHaveAttribute("href", "/favorites");
  });
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/layout/Sidebar.test.tsx`
Expected: FAIL — "즐겨찾기" 링크를 찾을 수 없음.

- [ ] **Step 3: Sidebar에 메뉴 추가**

`components/layout/Sidebar.tsx`에서 import 줄:
```tsx
import { HardDrive, LayoutDashboard, LogOut, Mail, NotebookText } from "lucide-react";
```
을 아래로 교체:
```tsx
import { HardDrive, LayoutDashboard, LogOut, Mail, NotebookText, Star } from "lucide-react";
```

`NAV_ITEMS` 배열:
```tsx
const NAV_ITEMS = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/drive", label: "Drive", icon: HardDrive },
  { href: "/notion", label: "Notion", icon: NotebookText },
];
```
을 아래로 교체:
```tsx
const NAV_ITEMS = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/drive", label: "Drive", icon: HardDrive },
  { href: "/notion", label: "Notion", icon: NotebookText },
  { href: "/favorites", label: "즐겨찾기", icon: Star },
];
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/layout/Sidebar.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: README 업데이트**

`README.md`의 "## Supabase 설정" 섹션에서 마이그레이션 안내 부분(1~2번 단계 근처)에 아래 줄을 추가한다 — 기존 `0001_oauth_tokens.sql` 안내 문구를 찾아 그 아래에 이어서 작성:
```markdown
4. `supabase/migrations/0002_favorites.sql`도 같은 방식으로 SQL Editor에 붙여넣고 실행 (즐겨찾기 기능용 테이블)
```

`README.md`의 "## 진행 현황" 섹션을 아래로 교체:
```markdown
## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [x] 3단계: Google Drive 연동
- [x] 4단계: Notion 연동
- [x] 5단계: 홈 화면 통합
- [x] UI 리디자인: 색상 토큰(다크/라이트), 사이드바 내비게이션, 아이콘, 타이포그래피
- [x] URL 즐겨찾기: 카테고리별 관리 페이지, 사이드바 연동
```

- [ ] **Step 6: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 테스트 회귀 없음, 기존 34개 파일 170개 테스트 + 이번 계획의 신규 7개 파일 48개 테스트[Task 1: 11개, Task 2: 22개, Task 3: 15개] = 41개 파일 218개 테스트)

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 7: 커밋**

```bash
git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx README.md
git commit -m "feat: 사이드바에 즐겨찾기 메뉴 추가"
```
