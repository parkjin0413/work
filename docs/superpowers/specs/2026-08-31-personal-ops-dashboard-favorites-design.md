# Personal Ops Dashboard — Favorites (URL 즐겨찾기) Design Spec

## 1. Overview

The dashboard currently proxies three external services (Gmail, Drive, Notion)
live — it stores no first-party application data of its own beyond OAuth
tokens. The user flagged the app as "too functionally thin for daily work
use" and asked, as the first concrete improvement, for a way to organize
frequently-used URLs (internal tools, external sites, etc.) into named,
categorized bookmarks reachable from the dashboard itself, instead of
relying on the browser's own bookmark bar.

This is the first feature in this project that persists genuine first-party
data in Supabase (not a proxy of an external API, and not a secret like an
OAuth token) — a new precedent worth naming explicitly, since it sets the
pattern any future first-party-data feature will follow.

## 2. Goals

- Let the single admin user organize URLs into named categories (e.g.
  "업무", "개인") and named favorites within each category (e.g. "사내 위키"
  → `https://wiki.example.com`).
- Add exactly one new item to the existing left `Sidebar` — "즐겨찾기" —
  linking to a dedicated `/favorites` page, at the same level as the
  existing 홈/Gmail/Drive/Notion items.
- On `/favorites`, browsing (grouped-by-category list, click a favorite to
  open it) and management (add/rename/delete categories and favorites) live
  on the same page — there is no separate "sidebar preview" of favorites and
  no separate management-only page.
- Favorites open in a new browser tab, leaving the dashboard in place.

## 3. Non-Goals

- No favicon fetching, link-preview thumbnails, or metadata scraping for
  saved URLs — name + URL only.
- No drag-and-drop reordering UI in v1 — categories and favorites are
  created in order and that's the display order (a `sort_order` column
  exists in the schema for future reordering, but no UI writes to it yet
  beyond append-at-end).
- No sharing, tagging, or search across favorites — this is a small,
  flat organizational tool for one person, not a bookmarking service.
- No client-side fetching, API route, or `localStorage` for a
  sidebar-embedded favorites preview — an earlier design draft proposed
  this, but the user clarified they want a single static "즐겨찾기" link
  like the other four Sidebar items, with all browsing/management on the
  destination page itself. Explicitly rejected — see §8 Key Decisions.

## 4. Data Model

Two new Supabase tables, migration file
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

Deleting a category cascades to delete its favorites (`on delete cascade`)
— the management UI confirms this with the user before deleting (§7 Error
Handling). This mirrors the existing `oauth_tokens` table's security model
exactly (RLS enabled, zero policies, service-role-only access) — consistent
with this app never querying Supabase directly from client code.

`sort_order` exists on both tables for future reordering support (§3
Non-Goals) but v1 only ever appends new rows with the next integer.

## 5. Data Access & Server Actions

`lib/favorites/favoritesStore.ts` (new), following the exact pattern of
`lib/notion/notionClient.ts` — a thin wrapper around
`createSupabaseServiceClient()`:

```ts
export type FavoriteSummary = { id: string; name: string; url: string };
export type CategoryWithFavorites = {
  id: string;
  name: string;
  favorites: FavoriteSummary[];
};

export async function listCategoriesWithFavorites(): Promise<CategoryWithFavorites[]>;
export async function createCategory(name: string): Promise<void>;
export async function renameCategory(id: string, name: string): Promise<void>;
export async function deleteCategory(id: string): Promise<void>;
export async function createFavorite(input: {
  categoryId: string;
  name: string;
  url: string;
}): Promise<void>;
export async function renameFavorite(
  id: string,
  input: { name: string; url: string }
): Promise<void>;
export async function deleteFavorite(id: string): Promise<void>;
```

`createFavorite`/`renameFavorite` validate `url` starts with `http://` or
`https://` and throw a descriptive error if not — the Server Action layer
converts this into the Korean error message shown to the user (§7).

`app/favorites/actions.ts` (new) wraps each store function as a Server
Action. Every action's first statement is `await requireAdmin()`, per this
project's established defense-in-depth rule (middleware already protects
the route, but every mutating action re-checks).

## 6. Pages & Components

`app/favorites/page.tsx` (new) — a Server Component, same shell as every
other authenticated page (`<Sidebar />` + `<main>`), fetching
`listCategoriesWithFavorites()` and rendering:

- A "새 카테고리" creation form at the top (`CreateCategoryForm.tsx`).
- One section per category: category name + rename/delete controls
  (`CategoryRowActions.tsx`), a "새 즐겨찾기 추가" form scoped to that
  category (`CreateFavoriteForm.tsx`, takes `categoryId`), and a list of
  that category's favorites — each favorite is a link (`target="_blank"
  rel="noopener noreferrer"`) showing its name, plus rename/delete controls
  (`FavoriteRowActions.tsx`).
- Empty states: no categories yet → "카테고리를 먼저 만들어주세요."; a
  category with no favorites yet → "즐겨찾기가 없습니다." inside that
  category's section.

All five new files follow the exact structural and styling conventions
established in `app/notion/page.tsx` / `CreateItemForm.tsx` /
`ItemRowActions.tsx` (semantic design tokens, Korean-only text, `role="alert"`
error display, disabled-when-empty submit buttons).

## 7. Sidebar Integration

`components/layout/Sidebar.tsx`'s `NAV_ITEMS` array gets exactly one new
entry, in the same shape as the existing four:

```ts
{ href: "/favorites", label: "즐겨찾기", icon: Star },
```

(`Star` from `lucide-react`.) No other change to `Sidebar.tsx` — the
existing `usePathname()`-based active-route highlighting
(`pathname?.startsWith(href)`) already handles `/favorites` correctly with
no special-casing needed.

## 8. Key Decisions Log

- **Two relational tables, not a single table with a text `category`
  column or a JSON blob.** Matches the existing Notion
  databases-→-items shape already in this codebase, gives clean
  category rename semantics (rename once, not per-row), and lets an
  empty category exist and be shown. User's explicit choice.
- **Favorites persisted in Supabase are genuine first-party app data** —
  the first time this project has stored anything beyond OAuth secrets.
  Deliberately reuses the `oauth_tokens` table's security model (RLS
  enabled, zero client-facing policies, service-role-only access)
  rather than introducing a new access pattern.
- **Sidebar gets one static link, not an embedded preview list.** An
  earlier design draft proposed a client-fetched, `localStorage`-persisted
  expandable submenu inside the Sidebar itself (to avoid navigating away
  just to see the list). The user clarified mid-design that this was not
  what they wanted — they want a single nav item identical in kind to the
  existing four, with all browsing and management happening on the
  destination page. This is simpler (no new API route, no client-side
  fetch/loading state, no `localStorage`) and was adopted immediately once
  clarified.
- **No favicon/preview fetching, no reordering UI, no tagging/search.**
  Rejected as scope creep for what the user described as a simple
  bookmark-organization need — see §3 Non-Goals.

## 9. Testing Strategy

- `lib/favorites/favoritesStore.ts` — mock the Supabase service client
  exactly as `lib/notion/notionClient.ts`'s tests do; cover each CRUD
  function's success path and the URL-format validation's rejection path.
- `app/favorites/actions.ts` — verify `requireAdmin()` is called first in
  each action, and that store errors surface correctly.
- `CreateCategoryForm.tsx`, `CreateFavoriteForm.tsx`, `CategoryRowActions.tsx`,
  `FavoriteRowActions.tsx` — same test shape as their Notion counterparts
  (`CreateItemForm.test.tsx`, `ItemRowActions.test.tsx`): render, submit,
  assert the Server Action is called with the right arguments, assert
  Korean error text on rejection.
- `app/favorites/page.tsx` — no-categories state, category-with-no-favorites
  state, and populated state (multiple categories, multiple favorites each,
  correct grouping).
- `components/layout/Sidebar.test.tsx` — extend the existing "4개의 메뉴
  링크" test to assert a 5th link, "즐겨찾기" → `/favorites`.
