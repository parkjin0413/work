# Personal Ops Dashboard — Gmail 편지함 구분 & 일괄 삭제 Design Spec

## 1. Overview

The dashboard's Gmail integration currently shows one undifferentiated list of
the 20 most recent messages, with only single-message trash (from the detail
page). The user asked, as the second "make existing features more usable for
real daily work" improvement, for two Gmail-like conveniences: (1) mailbox
separation (inbox/sent/spam/trash, like Gmail's own UI), and (2) multi-select
bulk delete from the list. This is the first multi-select UI pattern
introduced anywhere in this app.

## 2. Goals

- Add 4 mailbox tabs to `/gmail`: 받은편지함(Inbox) / 보낸편지함(Sent) /
  스팸(Spam) / 휴지통(Trash), backed by Gmail's system labels
  (`INBOX`/`SENT`/`SPAM`/`TRASH`). Switching tabs filters the message list to
  that label only.
- Add per-row checkboxes plus a "전체 선택" (select-all) checkbox and a
  "선택 삭제" (delete selected) button to the message list, moving all
  selected messages to trash in one action.
- Clicking a message's subject/sender area still navigates to its detail
  page as before; clicking its checkbox only toggles selection.

## 3. Non-Goals

- No custom/user-defined Gmail labels — system labels only (Inbox, Sent,
  Spam, Trash). See §8 Key Decisions.
- No other bulk actions (mark read/unread, archive, star) — delete only.
- No pagination/"load more" — each mailbox tab still caps at the most
  recent 20 messages, matching the existing single-list behavior.
- No changes to the detail page's existing single-message trash button,
  compose page, or the home page's Gmail summary card (which keeps
  showing the 3 most recent messages overall, unfiltered by mailbox).

## 4. Data Layer

`lib/google/gmailClient.ts`:

- `listRecentMessages(maxResults = 20, labelIds?: string[]): Promise<GmailMessageSummary[]>`
  — adds an optional `labelIds` parameter, passed straight through to the
  Gmail API's `users.messages.list({ labelIds })`. Omitting it preserves
  today's behavior (no filter). Return type and every other behavior
  unchanged.
- `trashMessages(ids: string[]): Promise<void>` (new) — calls the existing
  single-message `gmail.users.messages.trash()` once per ID, in parallel via
  `Promise.all`. The existing single-arg `trashMessage(id)` is untouched and
  keeps serving the detail page's single-delete button.

**Mailbox → label mapping**, validated server-side against this exact
whitelist (anything else — missing, unknown, or tampered query value — falls
back to `INBOX`, so no arbitrary string ever reaches the Gmail API):

| Tab (Korean) | `?mailbox=` value | Gmail label ID |
|---|---|---|
| 받은편지함 | `inbox` (default) | `INBOX` |
| 보낸편지함 | `sent` | `SENT` |
| 스팸 | `spam` | `SPAM` |
| 휴지통 | `trash` | `TRASH` |

## 5. Server Action

`app/gmail/actions.ts` (new — list-page-level actions, separate from the
existing detail-page `app/gmail/[id]/actions.ts`):

```ts
export async function trashMessagesAction(ids: string[]): Promise<void>
```

`requireAdmin()` first, then `trashMessages(ids)`, then
`revalidatePath("/gmail")` — same shape as every other mutating action in
this app.

## 6. UI

**Mailbox tabs**: rendered inline in `app/gmail/page.tsx` (plain `<Link
href="/gmail?mailbox=...">` elements reading the current tab from
`searchParams.mailbox` — no client-side state needed, so no new component
file for this part). The active tab gets the same accent-highlighted
treatment already used for `Sidebar`'s active nav item
(`bg-accent/10 text-accent`), inactive tabs use `text-muted`.

**Message list**: extracted into a new Client Component, `MessageList.tsx`
(`messages: GmailMessageSummary[]` prop), since checkbox selection needs
client-side state that a Server Component can't hold:
- A header row: "전체 선택" checkbox, a "N개 선택됨" count, and a
  "선택 삭제" button (disabled when 0 selected).
- Each message row: a checkbox (click toggles selection only, does not
  navigate) beside the existing subject/sender/snippet block (click
  navigates to `/gmail/{id}`, exactly as today).
- Clicking "선택 삭제": `window.confirm` with the count
  ("N개의 메일을 휴지통으로 이동하시겠습니까?"), then calls
  `trashMessagesAction(selectedIds)`, then `router.refresh()`.

`app/gmail/page.tsx` keeps its existing connection/error banners and
not-connected/load-error states exactly as they are today; only the
`listRecentMessages()` call gains the resolved `labelIds` argument, and the
message-rendering `<ul>` is replaced by `<MessageList messages={messages} />`.

## 7. Error Handling

- Bulk delete requires an explicit `window.confirm` before running (matches
  the existing pattern used for Notion category deletion).
- `trashMessages`'s `Promise.all` means a partial failure (some messages
  already trashed server-side before a later one fails) is possible even
  though the action throws as a whole. On failure, `MessageList` shows
  `role="alert"` text: `"일부 메일 삭제에 실패했습니다. 목록을 새로고침해서 확인해주세요."`
  — and still calls `router.refresh()` so the list reflects whatever
  actually succeeded, rather than leaving stale rows on screen.
- "선택 삭제" is disabled whenever the selection is empty — no confirm
  dialog can fire with zero targets.
- Mailbox-level fetch failures (expired connection, etc.) reuse the
  existing `loadError` banner/state already on this page — unaffected by
  this change.

## 8. Key Decisions Log

- **System labels only, no custom user labels.** Keeps the label whitelist
  small and avoids an extra `gmail.users.labels.list` call plus dynamic tab
  rendering, for a feature explicitly scoped as "like Gmail's basic
  folders." User's explicit choice.
- **Tabs on the page itself, not in the Sidebar.** Keeps `Sidebar` a flat,
  5-item, app-wide nav (as established by the recent UI redesign) rather
  than growing per-feature sub-navigation into it. User's explicit choice.
- **Delete-only bulk action, no mark-read/unread.** Matches the original
  ask exactly; adding read-state toggling would need a new `UNREAD` label
  `modify` call and read/unread visual treatment neither this app nor the
  Gmail list currently has — deferred as unrequested scope. User's
  explicit choice.
- **No pagination.** Consistent with the existing single-list page's
  behavior; each mailbox tab is a same-shape "most recent 20" view, not a
  full mailbox browser. User's explicit choice.
- **Server-side `Promise.all` loop over Gmail's `batchModify` API.**
  `trash()` on a single message does more than add the `TRASH` label (it
  also clears `INBOX`/`SPAM`/`UNREAD` as appropriate); replicating that
  exactly via `batchModify`'s raw add/remove-label parameters risks subtle
  behavioral drift from the already-working single-delete path. At this
  app's scale (≤20 messages selectable at once), N parallel calls to the
  proven `trash()` method is simpler and safer than a new, less-tested
  code path for a marginal request-count savings.

## 9. Testing Strategy

- `lib/google/gmailClient.test.ts`: `listRecentMessages` passes `labelIds`
  through to the Gmail API call when provided; `trashMessages` calls
  `trash()` once per ID (parallel), and rejects if any individual call
  rejects.
- `app/gmail/actions.test.ts` (new): `trashMessagesAction` calls
  `requireAdmin()` first, calls `trashMessages` with the given IDs on
  success, calls `revalidatePath("/gmail")`.
- `components` or `app/gmail/MessageList.test.tsx` (new): select-all
  toggles every row; selecting/deselecting individual rows updates the
  displayed count and enables/disables the delete button correctly;
  clicking delete with a confirmed dialog calls `trashMessagesAction` with
  exactly the selected IDs; canceling the confirm dialog calls nothing;
  a rejected action shows the Korean partial-failure alert text.
- `app/gmail/page.test.tsx`: all 4 mailbox tab links render with the
  correct `href`s; the tab matching the current `?mailbox=` value gets the
  active-state treatment; `listRecentMessages` is called with the label ID
  resolved from a valid/missing/invalid `mailbox` query value (three
  cases: valid value, absent value defaults to `INBOX`, garbage value also
  defaults to `INBOX`).
