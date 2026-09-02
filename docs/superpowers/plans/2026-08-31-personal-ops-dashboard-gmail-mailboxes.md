# Gmail 편지함 구분 & 일괄 삭제 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/gmail`에 받은편지함/보낸편지함/스팸/휴지통 4개 탭을 추가하고, 체크박스로 여러 메일을 선택해 한 번에 휴지통으로 옮기는 기능을 추가한다.

**Architecture:** Gmail API의 시스템 라벨(`INBOX`/`SENT`/`SPAM`/`TRASH`)로 `listRecentMessages`를 필터링하고, 새 `trashMessages(ids)` 함수로 여러 메시지를 병렬 삭제한다. 체크박스 선택 상태는 새 클라이언트 컴포넌트 `MessageList`가 관리한다.

**Tech Stack:** 기존 스택 재사용 (신규 의존성 없음)

**Spec:** [docs/superpowers/specs/2026-08-31-personal-ops-dashboard-gmail-mailboxes-design.md](../specs/2026-08-31-personal-ops-dashboard-gmail-mailboxes-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다.
- 모든 mutating Server Action은 `await requireAdmin()`을 첫 줄에서 호출한다.
- 색상은 시맨틱 토큰 클래스만 사용한다(`bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `text-danger` 등) — raw Tailwind 팔레트 클래스는 쓰지 않는다.
- 편지함 매핑은 정확히 이 화이트리스트만 허용한다: `inbox`→`INBOX`(기본값), `sent`→`SENT`, `spam`→`SPAM`, `trash`→`TRASH`. 목록에 없거나 비어있는 값은 전부 `inbox`로 처리한다.
- 편지함당 최대 20개, 페이지네이션/더보기 없음.
- 일괄 삭제 외 다른 일괄 액션(읽음 표시 등)은 만들지 않는다.
- 기존 `listRecentMessages`/`trashMessage`(단건) 함수와 상세 페이지의 단건 삭제 버튼은 그대로 유지한다 — 시그니처만 하위 호환되게 확장한다.

---

### Task 1: gmailClient.ts 확장 — labelIds 필터 & 일괄 삭제

**Files:**
- Modify: `lib/google/gmailClient.ts`
- Modify: `lib/google/gmailClient.test.ts`

**Interfaces:**
- Consumes: 없음 (기존 `getGmailClient` 내부 헬퍼 재사용)
- Produces: `listRecentMessages(maxResults?: number, labelIds?: string[]): Promise<GmailMessageSummary[]>` (기존 시그니처에 `labelIds` 선택 인자만 추가), `trashMessages(ids: string[]): Promise<void>` (신규) — 둘 다 `lib/google/gmailClient.ts`. Task 2가 `trashMessages`를, Task 4가 `listRecentMessages`의 `labelIds` 인자를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `lib/google/gmailClient.test.ts` 전체 교체**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getGoogleRefreshTokenMock,
  setCredentialsMock,
  createGoogleOAuthClientMock,
  messagesListMock,
  messagesGetMock,
  messagesSendMock,
  messagesTrashMock,
} = vi.hoisted(() => {
  const setCredentialsMock = vi.fn();
  return {
    getGoogleRefreshTokenMock: vi.fn(),
    setCredentialsMock,
    createGoogleOAuthClientMock: vi.fn(() => ({ setCredentials: setCredentialsMock })),
    messagesListMock: vi.fn(),
    messagesGetMock: vi.fn(),
    messagesSendMock: vi.fn(),
    messagesTrashMock: vi.fn(),
  };
});

vi.mock("@/lib/google/tokenStore", () => ({
  getGoogleRefreshToken: getGoogleRefreshTokenMock,
}));

vi.mock("@/lib/google/oauthClient", () => ({
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("googleapis", () => ({
  google: {
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: messagesListMock,
          get: messagesGetMock,
          send: messagesSendMock,
          trash: messagesTrashMock,
        },
      },
    })),
  },
}));

import {
  listRecentMessages,
  getMessageDetail,
  sendEmail,
  trashMessage,
  trashMessages,
  isGoogleConnected,
} from "./gmailClient";

describe("gmailClient", () => {
  beforeEach(() => {
    getGoogleRefreshTokenMock.mockReset();
    setCredentialsMock.mockReset();
    createGoogleOAuthClientMock.mockClear();
    messagesListMock.mockReset();
    messagesGetMock.mockReset();
    messagesSendMock.mockReset();
    messagesTrashMock.mockReset();
  });

  it("Google 계정이 연결되어 있지 않으면 빈 목록을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await listRecentMessages();

    expect(result).toEqual([]);
    expect(messagesListMock).not.toHaveBeenCalled();
  });

  it("최근 메시지 목록을 제목/보낸사람/날짜/미리보기와 함께 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesListMock.mockResolvedValue({ data: { messages: [{ id: "msg-1" }] } });
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기 내용",
        payload: {
          headers: [
            { name: "Subject", value: "테스트 제목" },
            { name: "From", value: "sender@example.com" },
            { name: "Date", value: "2026-08-30" },
          ],
        },
      },
    });

    const result = await listRecentMessages(10);

    expect(messagesListMock).toHaveBeenCalledWith({ userId: "me", maxResults: 10 });
    expect(setCredentialsMock).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(result).toEqual([
      {
        id: "msg-1",
        subject: "테스트 제목",
        from: "sender@example.com",
        date: "2026-08-30",
        snippet: "미리보기 내용",
      },
    ]);
  });

  it("labelIds를 지정하면 API 호출에 포함한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesListMock.mockResolvedValue({ data: { messages: [] } });

    await listRecentMessages(20, ["SENT"]);

    expect(messagesListMock).toHaveBeenCalledWith({
      userId: "me",
      maxResults: 20,
      labelIds: ["SENT"],
    });
  });

  it("Google 계정이 연결되어 있지 않으면 상세 조회는 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await getMessageDetail("msg-1");

    expect(result).toBeNull();
  });

  it("상세 조회는 text/plain 본문을 디코딩해서 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    const bodyText = "안녕하세요, 본문입니다.";
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기",
        payload: {
          headers: [{ name: "Subject", value: "제목" }],
          mimeType: "text/plain",
          body: { data: Buffer.from(bodyText, "utf8").toString("base64") },
        },
      },
    });

    const result = await getMessageDetail("msg-1");

    expect(result?.body).toBe(bodyText);
  });

  it("HTML 전용 메시지는 본문에 HTML을 절대 반환하지 않는다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기 텍스트",
        payload: {
          headers: [{ name: "Subject", value: "제목" }],
          mimeType: "text/html",
          body: { data: Buffer.from("<script>alert(1)</script>", "utf8").toString("base64") },
        },
      },
    });

    const result = await getMessageDetail("msg-1");

    expect(result?.body).not.toContain("<script>");
    expect(result?.body).not.toContain("<");
    expect(result?.body).toBe("미리보기 텍스트");
  });

  it("존재하지 않는 메시지 ID는 null을 반환한다 (404)", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockRejectedValue({ response: { status: 404 } });

    const result = await getMessageDetail("missing-id");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockRejectedValue({ response: { status: 401 } });

    await expect(getMessageDetail("some-id")).rejects.toBeTruthy();
  });

  it("Google 계정이 연결되어 있지 않으면 발송 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(sendEmail({ to: "a@example.com", subject: "s", body: "b" })).rejects.toThrow();
  });

  it("발송은 Base64URL로 인코딩한 raw 메시지를 전송한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesSendMock.mockResolvedValue({});

    await sendEmail({ to: "a@example.com", subject: "제목", body: "본문" });

    expect(messagesSendMock).toHaveBeenCalledWith({
      userId: "me",
      requestBody: { raw: expect.any(String) },
    });
    const raw = messagesSendMock.mock.calls[0][0].requestBody.raw as string;
    expect(raw).not.toContain("+");
    expect(raw).not.toContain("/");
  });

  it("삭제는 트래시로 이동시킨다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock.mockResolvedValue({});

    await trashMessage("msg-1");

    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-1" });
  });

  it("Google 계정이 연결되어 있지 않으면 일괄 삭제 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(trashMessages(["msg-1"])).rejects.toThrow();
    expect(messagesTrashMock).not.toHaveBeenCalled();
  });

  it("일괄 삭제는 각 ID에 대해 trash를 호출한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock.mockResolvedValue({});

    await trashMessages(["msg-1", "msg-2", "msg-3"]);

    expect(messagesTrashMock).toHaveBeenCalledTimes(3);
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-1" });
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-2" });
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-3" });
  });

  it("일괄 삭제 중 하나라도 실패하면 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("삭제 실패"));

    await expect(trashMessages(["msg-1", "msg-2"])).rejects.toThrow();
  });

  it("isGoogleConnected은 refresh token 존재 여부를 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("token");
    expect(await isGoogleConnected()).toBe(true);

    getGoogleRefreshTokenMock.mockResolvedValue(null);
    expect(await isGoogleConnected()).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/google/gmailClient.test.ts`
Expected: FAIL — `trashMessages`가 아직 없어서 import 에러, `labelIds` 관련 테스트도 실패.

- [ ] **Step 3: `lib/google/gmailClient.ts` 수정**

`export async function listRecentMessages(maxResults = 20): Promise<GmailMessageSummary[]> {` 부터 그 함수의 `gmail.users.messages.list({ userId: "me", maxResults });` 줄까지를 아래로 교체:

```ts
export async function listRecentMessages(
  maxResults = 20,
  labelIds?: string[]
): Promise<GmailMessageSummary[]> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return [];
  }

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    ...(labelIds ? { labelIds } : {}),
  });
```

파일 맨 끝, `export async function trashMessage(id: string): Promise<void> { ... }` 함수 바로 다음(`isGoogleConnected` 함수 앞)에 아래 함수를 추가:

```ts
export async function trashMessages(ids: string[]): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await Promise.all(ids.map((id) => gmail.users.messages.trash({ userId: "me", id })));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/google/gmailClient.test.ts`
Expected: PASS (15개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/google/gmailClient.ts lib/google/gmailClient.test.ts
git commit -m "feat: Gmail 라벨 필터 조회와 일괄 삭제 함수 추가"
```

---

### Task 2: Server Action — 일괄 삭제

**Files:**
- Create: `app/gmail/actions.ts`
- Test: `app/gmail/actions.test.ts`

**Interfaces:**
- Consumes: Task 1의 `trashMessages(ids: string[]): Promise<void>`
- Produces: `trashMessagesAction(ids: string[]): Promise<void>` (`app/gmail/actions.ts`) — Task 3의 `MessageList` 컴포넌트가 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/gmail/actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, trashMessagesMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  trashMessagesMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/google/gmailClient", () => ({
  trashMessages: trashMessagesMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { trashMessagesAction } from "./actions";

describe("trashMessagesAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    trashMessagesMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("requireAdmin을 호출한다", async () => {
    trashMessagesMock.mockResolvedValue(undefined);

    await trashMessagesAction(["msg-1"]);

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 trashMessages를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(trashMessagesAction(["msg-1"])).rejects.toThrow();
    expect(trashMessagesMock).not.toHaveBeenCalled();
  });

  it("정상 삭제는 trashMessages와 revalidatePath를 호출한다", async () => {
    trashMessagesMock.mockResolvedValue(undefined);

    await trashMessagesAction(["msg-1", "msg-2"]);

    expect(trashMessagesMock).toHaveBeenCalledWith(["msg-1", "msg-2"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/gmail");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/gmail/actions.test.ts`
Expected: FAIL — `./actions` 모듈 없음.

- [ ] **Step 3: 구현**

`app/gmail/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { trashMessages } from "@/lib/google/gmailClient";

export async function trashMessagesAction(ids: string[]): Promise<void> {
  await requireAdmin();
  await trashMessages(ids);
  revalidatePath("/gmail");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/gmail/actions.test.ts`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add app/gmail/actions.ts app/gmail/actions.test.ts
git commit -m "feat: Gmail 일괄 삭제 Server Action 추가"
```

---

### Task 3: MessageList 컴포넌트 (체크박스 다중 선택)

**Files:**
- Create: `app/gmail/MessageList.tsx`
- Test: `app/gmail/MessageList.test.tsx`

**Interfaces:**
- Consumes: Task 2의 `trashMessagesAction`, `lib/google/gmailClient.ts`의 `type GmailMessageSummary`
- Produces: `MessageList({ messages: GmailMessageSummary[] })` (`app/gmail/MessageList.tsx`, named export `MessageList`) — Task 4가 `app/gmail/page.tsx`에서 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/gmail/MessageList.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MessageList } from "./MessageList";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { trashMessagesActionMock } = vi.hoisted(() => ({
  trashMessagesActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  trashMessagesAction: trashMessagesActionMock,
}));

const messages = [
  { id: "msg-1", subject: "첫 메일", from: "a@example.com", date: "2026-08-30", snippet: "내용1" },
  { id: "msg-2", subject: "둘째 메일", from: "b@example.com", date: "2026-08-30", snippet: "내용2" },
];

describe("MessageList", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    trashMessagesActionMock.mockReset();
  });

  it("전체 선택 체크박스를 누르면 모든 메일이 선택된다", () => {
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("전체 선택"));

    expect(screen.getByText("2개 선택됨")).toBeInTheDocument();
    expect(screen.getByLabelText("첫 메일 선택")).toBeChecked();
    expect(screen.getByLabelText("둘째 메일 선택")).toBeChecked();
  });

  it("선택된 게 없으면 선택 삭제 버튼이 비활성화된다", () => {
    render(<MessageList messages={messages} />);

    expect(screen.getByRole("button", { name: "선택 삭제" })).toBeDisabled();
  });

  it("확인창을 취소하면 삭제 액션을 호출하지 않는다", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    expect(trashMessagesActionMock).not.toHaveBeenCalled();
  });

  it("확인창에서 확인하면 선택된 ID로 삭제 액션을 호출한다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    trashMessagesActionMock.mockResolvedValue(undefined);
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    await waitFor(() => expect(trashMessagesActionMock).toHaveBeenCalledWith(["msg-1"]));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제가 실패하면 한글 에러 메시지를 보여준다", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    trashMessagesActionMock.mockRejectedValue(new Error("failed"));
    render(<MessageList messages={messages} />);

    fireEvent.click(screen.getByLabelText("첫 메일 선택"));
    fireEvent.click(screen.getByRole("button", { name: "선택 삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "일부 메일 삭제에 실패했습니다. 목록을 새로고침해서 확인해주세요."
    );
  });

  it("메일 제목 링크는 상세 페이지로 연결된다", () => {
    render(<MessageList messages={messages} />);

    expect(screen.getByRole("link", { name: /첫 메일/ })).toHaveAttribute("href", "/gmail/msg-1");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/gmail/MessageList.test.tsx`
Expected: FAIL — `./MessageList` 모듈 없음.

- [ ] **Step 3: 구현**

`app/gmail/MessageList.tsx`:
```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GmailMessageSummary } from "@/lib/google/gmailClient";
import { trashMessagesAction } from "./actions";

export function MessageList({ messages }: { messages: GmailMessageSummary[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allSelected = messages.length > 0 && selectedIds.length === messages.length;

  function toggleAll() {
    setSelectedIds(allSelected ? [] : messages.map((message) => message.id));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`${selectedIds.length}개의 메일을 휴지통으로 이동하시겠습니까?`)) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashMessagesAction(selectedIds);
      setSelectedIds([]);
      router.refresh();
    } catch {
      setErrorMessage("일부 메일 삭제에 실패했습니다. 목록을 새로고침해서 확인해주세요.");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-border bg-surface px-4 py-3">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="전체 선택" />
        <span className="text-sm text-muted">{selectedIds.length}개 선택됨</span>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0 || isDeleting}
          className="ml-auto rounded-lg border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "선택 삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="border-x border-border bg-surface px-4 py-2 text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-b-2xl border border-border bg-surface">
        {messages.map((message) => (
          <li key={message.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={selectedIds.includes(message.id)}
              onChange={() => toggleOne(message.id)}
              aria-label={`${message.subject} 선택`}
            />
            <Link
              href={`/gmail/${message.id}`}
              className="min-w-0 flex-1 hover:underline"
            >
              <p className="truncate text-sm font-medium text-foreground">{message.subject}</p>
              <p className="truncate text-xs text-muted">{message.from}</p>
              <p className="mt-1 truncate text-xs text-muted">{message.snippet}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/gmail/MessageList.test.tsx`
Expected: PASS (6개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add app/gmail/MessageList.tsx app/gmail/MessageList.test.tsx
git commit -m "feat: Gmail 메일 목록에 체크박스 다중 선택 컴포넌트 추가"
```

---

### Task 4: 홈 페이지 통합 — 편지함 탭 & MessageList 연결

**Files:**
- Modify: `app/gmail/page.tsx`
- Modify: `app/gmail/page.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `listRecentMessages(maxResults, labelIds)`, Task 3의 `MessageList`
- Produces: 없음 (이 계획의 마지막 태스크)

- [ ] **Step 1: 실패하는 테스트 작성 — `app/gmail/page.test.tsx`에 아래 5개 테스트를 기존 5개(파일 끝, `describe` 블록 안 마지막 `it` 다음) 뒤에 추가**

```tsx
  it("편지함 탭 4개를 올바른 href로 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({});

    expect(screen.getByRole("link", { name: "받은편지함" })).toHaveAttribute(
      "href",
      "/gmail?mailbox=inbox"
    );
    expect(screen.getByRole("link", { name: "보낸편지함" })).toHaveAttribute(
      "href",
      "/gmail?mailbox=sent"
    );
    expect(screen.getByRole("link", { name: "스팸" })).toHaveAttribute(
      "href",
      "/gmail?mailbox=spam"
    );
    expect(screen.getByRole("link", { name: "휴지통" })).toHaveAttribute(
      "href",
      "/gmail?mailbox=trash"
    );
  });

  it("현재 편지함 탭에 aria-current를 표시한다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({ mailbox: "sent" });

    expect(screen.getByRole("link", { name: "보낸편지함" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "받은편지함" })).not.toHaveAttribute("aria-current");
  });

  it("mailbox 파라미터가 없으면 INBOX로 조회한다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({});

    expect(listRecentMessagesMock).toHaveBeenCalledWith(20, ["INBOX"]);
  });

  it("잘못된 mailbox 값은 INBOX로 기본 처리한다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({ mailbox: "not-a-real-mailbox" });

    expect(listRecentMessagesMock).toHaveBeenCalledWith(20, ["INBOX"]);
  });

  it("mailbox=sent면 SENT로 조회한다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage({ mailbox: "sent" });

    expect(listRecentMessagesMock).toHaveBeenCalledWith(20, ["SENT"]);
  });
```

`renderGmailPage`의 타입 시그니처도 `mailbox`를 받도록 파일 상단의 함수 정의를 교체:
```tsx
async function renderGmailPage(
  searchParams: { error?: string; connected?: string; mailbox?: string } = {}
) {
  const element = await GmailPage({ searchParams });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/gmail/page.test.tsx`
Expected: FAIL — 편지함 탭이 아직 없어서 "받은편지함" 등 링크를 찾을 수 없음, `listRecentMessagesMock`도 인자 없이 호출됨.

- [ ] **Step 3: `app/gmail/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listRecentMessages, type GmailMessageSummary } from "@/lib/google/gmailClient";
import { MessageList } from "./MessageList";

const MAILBOX_LABELS: Record<string, string> = {
  inbox: "INBOX",
  sent: "SENT",
  spam: "SPAM",
  trash: "TRASH",
};

const MAILBOX_TABS: { value: string; label: string }[] = [
  { value: "inbox", label: "받은편지함" },
  { value: "sent", label: "보낸편지함" },
  { value: "spam", label: "스팸" },
  { value: "trash", label: "휴지통" },
];

export default async function GmailPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string; mailbox?: string };
}) {
  const connected = await isGoogleConnected();
  const mailbox =
    searchParams.mailbox && MAILBOX_LABELS[searchParams.mailbox] ? searchParams.mailbox : "inbox";
  const labelId = MAILBOX_LABELS[mailbox];

  let messages: GmailMessageSummary[] = [];
  let loadError = false;

  if (connected) {
    try {
      messages = await listRecentMessages(20, [labelId]);
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Gmail</h1>
          {connected && !loadError ? (
            <Link
              href="/gmail/compose"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              새 메일 작성
            </Link>
          ) : null}
        </div>

        {connected && !loadError ? (
          <nav aria-label="편지함" className="mt-4 flex gap-1">
            {MAILBOX_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/gmail?mailbox=${tab.value}`}
                aria-current={mailbox === tab.value ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mailbox === tab.value
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : null}

        {searchParams.connected === "1" ? (
          <p className="mt-4 rounded-md border border-success bg-success-bg px-4 py-2 text-sm text-success">
            Google 계정이 연결되었습니다.
          </p>
        ) : null}
        {searchParams.error === "missing_code" || searchParams.error === "access_denied" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결이 취소되었습니다. 다시 시도해주세요.
          </p>
        ) : null}
        {searchParams.error === "invalid_state" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            인증 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.
          </p>
        ) : null}
        {searchParams.error === "no_refresh_token" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결에 실패했습니다. Google 계정 설정에서 이 앱의 액세스를 제거한 뒤 다시
            연결해주세요.
          </p>
        ) : null}
        {searchParams.error === "token_exchange_failed" || searchParams.error === "save_failed" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : null}

        {!connected ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 연결
            </a>
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Gmail 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 다시 연결
            </a>
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-sm text-muted">받은 메일이 없습니다.</p>
        ) : (
          <MessageList messages={messages} />
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/gmail/page.test.tsx`
Expected: PASS (10개 테스트 모두 통과 — 기존 5개 + 신규 5개)

- [ ] **Step 5: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 회귀 없음 — baseline 41개 파일/219개 테스트에서 Task1(+4, 기존 파일), Task2(신규 파일 +3), Task3(신규 파일 +6), Task4(+5, 기존 파일)이 반영되어 총 43개 파일 / 237개 테스트)

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add app/gmail/page.tsx app/gmail/page.test.tsx
git commit -m "feat: Gmail 목록에 편지함 탭과 다중 선택 삭제 연결"
```
