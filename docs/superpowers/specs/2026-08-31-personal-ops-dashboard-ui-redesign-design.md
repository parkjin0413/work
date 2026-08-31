# Personal Ops Dashboard — UI Redesign Design Spec

## 1. Overview

The dashboard's 5 functional plans (foundation, Gmail, Drive, Notion, home
integration) are complete and merged to `master`. Every page currently uses
plain, ungrouped Tailwind neutral-palette classes (`bg-neutral-900`,
`border-neutral-800`, etc.) applied ad hoc per component. There is no design
system: no shared color tokens, no typography choice beyond the browser
default, and light mode is a dead toggle — `next-themes` flips the `class`
attribute, but zero `dark:` variants exist anywhere, so the toggle currently
produces no visual change at all.

This spec defines a small, cohesive design system (color tokens, typography,
a left-sidebar layout, and a shared component style vocabulary) inspired by
two reference dashboard screenshots the user supplied at project kickoff
(`Business Sales Dashboard Template.jpg` — "MarketSavy" style; `Modern
Dashboard UI_UX Concept_ Dark Mode Analytics.jpg` — "Aura Store" style), and
applies it consistently across all 8 existing pages plus shared layout
components. It does not add or change any functionality — every data flow,
Server Action, and route from the prior 5 plans is unchanged.

## 2. Goals

- Establish a semantic color token system (CSS custom properties) covering
  both dark and light themes, so light mode reaches the same level of
  polish as dark mode instead of remaining a visual no-op.
- Replace the top-only `AppHeader` with a left sidebar navigation (matching
  the "MarketSavy" reference), reflecting the app's 4 real destinations
  (홈/Gmail/Drive/Notion) as a persistent, glanceable nav.
- Introduce a single brand accent color (indigo) used consistently for
  buttons, active nav state, links, and focus rings — replacing the
  scattered `bg-blue-600` / `border-green-800` / etc. ad hoc colors.
- Add an icon library (`lucide-react`) and apply icons to nav items,
  service summary cards, and list rows for visual identification, matching
  the icon-forward feel of both reference images.
- Load a Korean-optimized sans-serif (Noto Sans KR via `next/font/google`)
  as the app's default font, replacing the unstyled system font stack.
- Apply the resulting style vocabulary (cards, buttons, forms, list rows)
  consistently across every existing page: `/login`, `/` (home), `/gmail`,
  `/gmail/[id]`, `/gmail/compose`, `/drive`, `/notion`, `/notion/[id]`, and
  `app/error.tsx`.

## 3. Non-Goals

- No new features, routes, data fetching, or Server Actions. This is a
  pure styling/layout pass over existing, already-working functionality.
- No component library adoption (shadcn/ui, Radix, etc.) — YAGNI at this
  app's scale (8 pages, no complex interactive widgets).
- No per-service accent colors (e.g., a distinct color for Gmail vs. Drive
  vs. Notion) — a single brand accent is used everywhere; only icons
  differ per service for identification. (Decided explicitly with the
  user — see §8 Key Decisions.)
- No mobile slide-out drawer / hamburger menu animation. Small-viewport
  behavior collapses the sidebar into a simple horizontal icon bar; no new
  interactive drawer component is built.
- No literal recreation of the reference images' layouts (their sales/KPI
  dashboards have charts, data tables, and metrics this app has no
  equivalent for). Only their color/typography/card-style tone is adapted.

## 4. Color Tokens

Defined as CSS custom properties in `app/globals.css`, toggled via the
`class` attribute `next-themes` already manages (`dark` class on `html`).
Mapped into `tailwind.config.ts`'s `theme.extend.colors` so components use
semantic utility classes (`bg-surface`, `text-muted`, `border-border`,
`bg-accent`) instead of raw palette values.

### Dark theme (default)

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0B0B0F` | Page background |
| `--color-surface` | `#16161C` | Card / sidebar background |
| `--color-surface-hover` | `#1E1E26` | Row / card hover state |
| `--color-border` | `#2A2A33` | Borders / dividers |
| `--color-text` | `#F5F5F7` | Primary text |
| `--color-text-muted` | `#9A9AA5` | Secondary / helper text |
| `--color-accent` | `#6366F1` | Buttons, active nav, links, focus ring |
| `--color-accent-hover` | `#4F46E5` | Accent hover state |
| `--color-accent-foreground` | `#FFFFFF` | Text/icon color on top of accent fill |
| `--color-danger` | `#EF4444` | Error banners/text (was `red-800`/`red-950`/`red-400`) |
| `--color-danger-bg` | `#3F1D1D` | Error banner background |
| `--color-success` | `#22C55E` | Success banners/text (was `green-800`/`green-950`/`green-400`) |
| `--color-success-bg` | `#14301F` | Success banner background |

### Light theme

| Token | Value |
|---|---|
| `--color-bg` | `#F7F7F9` |
| `--color-surface` | `#FFFFFF` |
| `--color-surface-hover` | `#F1F1F4` |
| `--color-border` | `#E4E4E9` |
| `--color-text` | `#121214` |
| `--color-text-muted` | `#6B6B76` |
| `--color-accent` | `#6366F1` (same as dark) |
| `--color-accent-hover` | `#4F46E5` (same as dark) |
| `--color-accent-foreground` | `#FFFFFF` (same as dark) |
| `--color-danger` | `#DC2626` |
| `--color-danger-bg` | `#FEE2E2` |
| `--color-success` | `#16A34A` |
| `--color-success-bg` | `#DCFCE7` |

Implementation: standard Tailwind class-based dark mode, matching
`next-themes`'s existing `attribute="class"` config. `:root` defines the
light values (the plain, un-classed default); `.dark` (applied to `<html>`
by `next-themes` when the theme is dark) overrides every token with the
dark values. Both themes are always fully specified — no media-query
fallback, no partial overrides.

## 5. Typography

`next/font/google`'s `Noto_Sans_KR` (weights 400, 500, 700) loaded once in
`app/layout.tsx` and applied as the default `font-sans` via
`tailwind.config.ts`. Self-hosted by Next.js at build time — no runtime CDN
dependency, no new npm package. Replaces the current unstyled system font
stack across every page automatically (no per-component change needed).

## 6. Layout — Sidebar Navigation

`AppHeader` (`components/layout/AppHeader.tsx`, currently a single top bar
holding the app title, `ThemeToggle`, and logout button) is deleted and
replaced by `components/layout/Sidebar.tsx`.

**Sidebar contents (top to bottom):**
1. Brand mark + "개인 업무 대시보드" title
2. Nav links: 홈 (`LayoutDashboard` icon) / Gmail (`Mail`) / Drive
   (`HardDrive`) / Notion (`NotebookText`) — the active route (matched via
   `usePathname()`) gets an accent-tinted background
3. (bottom, pinned) `ThemeToggle` (restyled with `Sun`/`Moon` icons) and a
   로그아웃 button (`LogOut` icon) — same `handleLogout` logic AppHeader
   currently has (Supabase `signOut()` → redirect to `/login` → `router.refresh()`)

**Responsive behavior:** Fixed, always-visible left column (~240px) at
`md:` breakpoint and above. Below `md:`, the sidebar collapses into a thin
horizontal top bar showing only the 4 nav icons (no labels, no
title/theme-toggle/logout — those remain reachable by widening the
viewport, since this is a personal desktop-first tool). No drawer, no
open/close animation, no state to manage.

**Page content:** Each page keeps its existing in-content heading (e.g.
"Gmail", "Drive") and page-specific actions (e.g. "새 메일 작성" button) at
the top of its own content area — the sidebar is pure navigation, it does
not duplicate page titles or actions.

**Auth boundary:** `/login` does not render the sidebar (user isn't
authenticated yet) — it keeps its own standalone centered-card layout (see
§7).

## 7. Component Style Vocabulary

- **Cards** (home summary cards, list containers): `rounded-2xl bg-surface
  border border-border`, hover state `border-accent/40`. Home summary
  cards additionally get a small circular icon badge top-left
  (`bg-accent/10 text-accent`, service-specific `lucide-react` icon) for
  visual identification — per §3 Non-Goals, only the icon differs per
  service, not the accent color itself.
- **List rows** (Gmail message list, Drive file list, Notion item list):
  each row gets a small leading icon (message/file/item type) and
  `hover:bg-surface-hover`; dividers via `divide-border`.
- **Buttons:**
  - Primary: `bg-accent text-accent-foreground rounded-lg
    hover:bg-accent-hover` — replaces every current `bg-blue-600` instance
    (compose button, connect/reconnect links, form submits).
  - Secondary: `border border-border text-text rounded-lg` (transparent
    background) — replaces plain-bordered buttons like the current
    logout/theme-toggle styling.
- **Forms** (Gmail compose, Notion create-item): inputs/textareas get
  `bg-surface border-border focus:ring-2 focus:ring-accent`.
- **Status banners** (연결됨/오류 등 existing inline messages on `/gmail`,
  `/drive`): recolored to the `--color-success`/`--color-success-bg` and
  `--color-danger`/`--color-danger-bg` tokens instead of the current
  hardcoded `green-800`/`red-800` Tailwind classes.
- **Login page** (`app/login/page.tsx`): restructured as a centered card
  (`bg-surface`, `rounded-2xl`, brand mark above the form) instead of the
  current bare form — the only page-specific layout change beyond adopting
  the shared token/typography system, since it sits outside the sidebar
  shell.
- **Error boundary** (`app/error.tsx`, added earlier this session): restyled
  to the same card vocabulary — no behavioral change, just token/class
  updates.

## 8. Key Decisions Log

- **Overall aesthetic anchor: "MarketSavy" over "Aura Store."** Charcoal
  background with a single restrained accent color, not the more vivid
  gradient-card look of the second reference. User's explicit choice.
- **Sidebar navigation added despite only 4 destinations.** Gives the app
  a persistent "dashboard" feel matching the references, at low cost since
  the nav item count is small and fixed.
- **Single brand accent color, not per-service colors.** Simpler,
  cohesive, avoids an inconsistent rainbow of unrelated brand colors
  (Gmail red / Drive green / Notion black) competing with the app's own
  identity. Services stay visually distinguishable via icon choice alone.
- **`lucide-react` added as a new dependency.** Small (~30KB), well-known,
  tree-shakeable, closest icon language to both reference images.
- **Light mode built to the same fidelity as dark mode**, not a rough
  placeholder — closes the gap flagged as a known limitation in every
  prior plan's final review (Plans 1, 2, and the project memory's ongoing
  "light mode still unimplemented" note).
- **No component library adoption.** Rejected as overkill at this app's
  scale (YAGNI) — see §3 Non-Goals.
- **No mobile drawer/hamburger.** Rejected to keep scope bounded; the
  collapsed icon-bar fallback is enough for a personal, primarily-desktop
  tool.

## 9. Testing Impact

- No `.test.tsx` file in the current suite queries by the `banner` landmark
  role or an `AppHeader`-specific heading role in a way that would break
  from removing `<header>` — confirmed via grep before writing this spec.
- `components/layout/AppHeader.test.tsx`'s two cases (제목 표시, 로그아웃 동작)
  move to a new `components/layout/Sidebar.test.tsx`, asserting the same
  behavior (title text present, logout button triggers `signOut` + redirect
  to `/login`) plus new assertions for nav links (4 links present with
  correct `href`s, active link styling/attribute on the current route via
  a mocked `usePathname()`).
- All other existing tests assert Korean text content, `href` values, and
  button accessible names — none of which change in this redesign — so
  they are expected to keep passing unmodified. Implementers must still run
  the full suite after each task to catch any incidental breakage from
  markup restructuring (e.g., a card's text moving into a nested element
  that changes what `getByText` matches).
- New tests needed: `Sidebar.test.tsx` (as above), and a light-mode
  rendering check for at least one representative page confirming the
  `dark`/light class toggle actually changes computed background (a smoke
  test that light mode is no longer a no-op).

## 10. Out of Scope (Future Considerations)

- Per-service accent colors (rejected in this spec, could revisit later
  with explicit user request).
- Mobile drawer navigation.
- Any new dashboard functionality (search, notifications, charts) — the
  reference images' additional features were never in scope for this
  app (see original spec's own Future Considerations section).
