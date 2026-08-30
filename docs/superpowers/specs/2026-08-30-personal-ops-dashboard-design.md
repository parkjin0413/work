# Personal Ops Dashboard — Design Spec

Date: 2026-08-30
Status: Approved (design), pending implementation plan

## 1. Overview

A personal, single-admin work dashboard that unifies Gmail, Google Drive, and
Notion into one web app. It is not a sales/analytics dashboard — the two
reference images (`Business Sales Dashboard Template.jpg`,
`Modern Dashboard UI_UX Concept_ Dark Mode Analytics.jpg`) are style
references only (layout rhythm, card composition, dark-mode visual language),
not data references. No revenue/order/customer metrics are part of this
product.

## 2. Goals

- One home screen summarizing recent activity across Gmail, Drive, and Notion.
- Per-service detail pages with full functionality:
  - Gmail: read, send, delete/trash messages.
  - Drive: browse, upload, and manage (rename/delete) files.
  - Notion: view, create, and update pages/database items.
- Single admin account, no public signup or multi-tenant concerns.
- Deployable stack: Next.js + Supabase + GitHub + Vercel.

## 3. Non-Goals

- No sales/revenue/order analytics of any kind.
- No local caching/sync layer in v1 (see §10 Future Considerations).
- No support for multiple users/accounts.
- No mobile native app; responsive web only.

## 4. Stack

- **Frontend/Backend**: Next.js (App Router), deployed on Vercel.
- **Database/Auth**: Supabase (Postgres + Supabase Auth).
- **Source control/CI**: GitHub, connected to Vercel for auto-deploy.

## 5. Authentication

- Supabase Auth with exactly one pre-created admin user (email/password or
  magic link — implementation plan to decide). No signup UI is built.
- Middleware protects all routes: valid session required, and the
  session's user must match the single allowed admin user id/email.
- No role/permission system needed beyond this single check.

## 6. Integration Architecture — Live Proxy (Approach A)

Chosen over a local-mirror/sync architecture and over direct client-to-API
calls. Rationale: single low-traffic user, so caching gains are marginal;
avoiding a sync layer avoids staleness/webhook complexity; and keeping
tokens server-side avoids exposing delete-capable credentials to the
browser.

- All calls to Gmail, Drive, and Notion happen from the Next.js server
  (Route Handlers / Server Actions), never from client-side JS.
- No local mirror of email/file/page data. Every page view fetches live
  from the respective API.
- Write actions (send/delete mail, upload/rename/delete file, create/update
  Notion page) call the external API directly, then revalidate the
  relevant page/cache tag so the UI reflects the change immediately.

## 7. Per-Service Setup

### 7.1 Gmail + Google Drive (shared Google Cloud project)

- One Google Cloud project provides OAuth for both Gmail and Drive.
- OAuth consent screen stays in **Testing** publishing status with the
  admin's own Google account added as a test user. This avoids Google's
  app verification process entirely, since only that one test user will
  ever authorize the app.
- Scopes:
  - `https://www.googleapis.com/auth/gmail.modify` (read, trash/delete,
    label/archive)
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/drive` (full read/write access,
    needed because "manage files" includes rename/delete beyond files the
    app itself created — `drive.file` scope would be too narrow)
- Refresh tokens are stored server-side, encrypted at rest (see §8), in a
  Supabase `oauth_tokens` table. Access tokens are minted on-demand from
  the refresh token and never persisted.
- Token refresh/expiry: server wrapper functions refresh transparently
  before each API call batch; on `invalid_grant`/revocation, the affected
  service's home card shows a "reconnect required" state (§9).

### 7.2 Notion

- Uses a Notion **Internal Integration** token instead of OAuth (simpler
  for a single admin — no consent flow, no redirect URIs to manage).
- Token stored as a Vercel environment variable, read only server-side.
- One-time manual setup step (cannot be automated via API): the admin
  must open each Notion page/database they want visible in the dashboard
  and explicitly share it with the integration from Notion's UI. The
  spec's implementation plan should include this as a documented setup
  step, and the app should surface a clear message when a referenced
  page/database is not shared with the integration.

## 8. Token Storage & Security

- Google refresh tokens live in a Supabase table (`oauth_tokens`),
  encrypted with a symmetric key (AES-GCM) held only in a server-side
  environment variable (Vercel). Encryption/decryption happens in a small
  server-only helper module; no plaintext token is ever sent to the
  client or logged.
- Notion token is a static secret in an environment variable — not stored
  in the database at all.
- Row Level Security on all Supabase tables restricts access to the
  service role used by server-side code; no client-side Supabase queries
  touch token tables.

## 9. UI / Design Direction

- **Layout**: Home screen with summary cards for Gmail, Drive, and Notion
  (recent items per service), each linking to a full per-service detail
  page (`/gmail`, `/drive`, `/notion`) with complete functionality. This
  mirrors the sidebar + card structure of the "Modern Dashboard" reference
  image most closely.
- **Theme**: Dark mode is the default visual style, matching the
  "Modern Dashboard UI/UX Concept" reference (dark background, accent-color
  stat/summary cards). A light-mode toggle is included from the start.
- **Service states surfaced in the UI**:
  - Connected/working (normal card content).
  - "Reconnect required" (Google token revoked/expired — shows a
    reconnect button that restarts the OAuth flow).
  - "Not shared with integration" (Notion page/database not yet shared —
    shows setup instructions rather than an error).
- Detailed component-level styling (colors, typography, spacing tokens)
  is deferred to the frontend-design/ui-ux-pro-max implementation pass,
  not fixed in this spec.
- **UI language**: all user-facing text (labels, buttons, empty states,
  error/reconnect messages) is written in Korean. Code identifiers
  (variables, functions, component names) stay in English per normal
  convention — only user-facing strings are Korean.

## 10. Data Flow (Summary)

1. Request hits Next.js middleware → verifies Supabase session belongs to
   the single admin user; otherwise redirects to login.
2. Home page (server component) fires parallel server-side requests to
   Gmail (list recent messages), Drive (list recent files), and Notion
   (query configured database(s)/page(s)) using the stored/refreshed
   credentials, and renders summary cards.
3. Navigating to a detail page (`/gmail`, `/drive`, `/notion`) fetches the
   fuller list/detail data for that service only.
4. A write action (e.g., send email, upload file, create Notion page) is
   a Server Action that calls the external API, then triggers revalidation
   of the affected page so the new state is visible without a manual
   refresh.

## 11. Error Handling

- External API errors (rate limit, network failure) surface as an inline
  error state on the affected card/section with a retry action, not a
  full-page crash.
- Expired/revoked Google tokens trigger a "reconnect" affordance per
  §9, scoped to Gmail and/or Drive independently (they can expire
  independently even though they share one OAuth app).
- Notion "object not shared with integration" errors are translated into
  the specific setup instructions from §7.2, not a generic error message.

## 12. Testing Strategy

Given this is a single-user internal tool, testing favors targeted unit
coverage over broad E2E automation:

- Unit tests for: token encryption/decryption helper, Google token
  refresh wrapper, and the API wrapper functions for each service
  (mocking the external HTTP calls).
- Manual verification pass against the real Gmail/Drive/Notion accounts
  for each write action (send, delete, upload, create/update) before
  considering the feature done.

## 13. Future Considerations (Out of Scope for v1)

- Local mirror/sync layer (Approach B) if live-fetch performance becomes
  a problem at higher usage.
- Additional home-screen widgets (e.g., combined "today" view merging
  Gmail + Notion tasks, unified search across all three services) — the
  user confirmed these are optional future additions, not part of the
  initial build.
- Push-based sync (Gmail push notifications via Pub/Sub, Notion webhooks)
  instead of on-demand fetch.

## 14. Key Decisions Log (for traceability)

| Decision | Choice | Why |
|---|---|---|
| Dashboard content | Gmail/Drive/Notion only, no sales metrics | Reference images are style-only; user confirmed this is a personal ops tool |
| Integration architecture | Live proxy (Approach A) | Low traffic, avoids sync complexity, YAGNI |
| Notion auth | Internal Integration token | Single admin; simpler than OAuth |
| Google OAuth publishing status | Testing mode | Single test user avoids Google app verification |
| Layout | Home summary + per-service detail pages | Matches reference image structure; keeps each service's full feature set out of the home page |
| Theme | Dark-mode default with light-mode toggle | Matches "Modern Dashboard" reference; user requested toggle |
| Gmail scope | Read + send + delete/trash | User explicitly requested full read/write/delete |
| Drive scope | Read + upload/manage | User explicitly requested this scope |
| Notion scope | Read + create/update | User explicitly requested this scope |
| UI language | Korean for all user-facing text | User explicitly requested an all-Korean dashboard UI |
