# 개인 업무 대시보드 - Notion 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 대시보드 안에서 Notion Integration과 공유된 데이터베이스 목록을 보고, 각 데이터베이스의 항목(페이지)을 조회하고, 새 항목을 추가하고, 기존 항목의 제목을 수정할 수 있게 한다. 이 계획은 5단계 중 4단계이며, 1~3단계(기반 구축, Gmail, Drive)가 이미 `master`에 병합되어 있다.

**Architecture:** 스펙 §7.2에 따라 OAuth 대신 Notion **Internal Integration 토큰**을 사용한다 — Gmail/Drive와 달리 완전히 새로운 인증 방식이며, 토큰은 Vercel 환경변수(`NOTION_API_KEY`)에만 존재하고 Supabase에 저장하지 않는다(스펙 §8). 스펙 §7.2가 명시하듯 "어떤 데이터베이스를 이 Integration과 공유할지"는 Notion UI에서 관리자가 직접, API로 자동화할 수 없는 수동 작업이므로, 앱은 `search` API로 **현재 공유된 데이터베이스만** 조회해 보여주고, 공유된 것이 없을 때 명확한 한글 안내를 보여준다(스펙 §9, §158). 스펙은 삭제 기능을 요구하지 않는다 — "view, create, and update"만 요구하므로 삭제 UI는 만들지 않는다. Gmail/Drive 계획의 최종 리뷰에서 얻은 교훈(force-dynamic, requireAdmin() 방어, 404/기타 에러 구분, 클라이언트 에러 복구, 액션 자체 테스트, 빈 입력 시 버튼 비활성화)을 처음부터 반영한다.

**Tech Stack:** `@notionhq/client`(Notion 공식 Node SDK) · Next.js Server Actions

**Spec:** [docs/superpowers/specs/2026-08-30-personal-ops-dashboard-design.md](../specs/2026-08-30-personal-ops-dashboard-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다.
- 라이브 프록시 구조 — Notion 데이터를 로컬에 캐시/미러링하지 않는다 (스펙 §6).
- Notion 스코프는 조회+생성+수정만 포함한다 — **삭제 기능은 만들지 않는다** (스펙 §2, §196 — Gmail/Drive와 달리 delete가 명시되지 않음).
- Notion 토큰은 Supabase에 저장하지 않는다 — `NOTION_API_KEY` 환경변수로만 서버에서 읽는다 (스펙 §8).
- 공유되지 않았거나 존재하지 않는 데이터베이스 ID에 접근하면 `notFound()`로, 그 외 API 에러(잘못된 토큰 등)는 "NOTION_API_KEY 값을 확인해주세요" 안내로 구분한다. Notion은 OAuth가 아니므로 "다시 연결" 링크 대신 환경변수 점검을 안내한다.
- 라이브 데이터를 읽는 모든 페이지(Server Component)는 `export const dynamic = "force-dynamic"`을 명시한다.
- Notion 데이터를 변경하는 모든 Server Action은 함수 본문 첫 줄에 `await requireAdmin()`을 호출하고, **이 태스크들은 처음부터 전용 테스트 파일을 갖는다** (Gmail/Drive 계획에서 이 테스트가 없어 최종 리뷰에서 지적된 바 있음).
- 클라이언트 컴포넌트에서 Server Action을 호출할 때는 항상 `try/catch`로 감싸 실패 시 한글 에러 메시지를 보여주고 로딩 상태를 `finally`에서 원복한다 — 버튼이 영구히 비활성 상태로 멈추지 않는다. 빈 입력으로는애초에 제출 버튼이 비활성화되어 서버 왕복이 필요 없다.

---

### Task 1: Notion API 래퍼 + 환경변수/문서

**Files:**
- Create: `lib/notion/notionClient.ts`
- Test: `lib/notion/notionClient.test.ts`
- Modify: `.env.local.example`
- Modify: `README.md`

**Interfaces:**
- Produces: `type NotionDatabaseSummary = { id: string; title: string }`, `type NotionItemSummary = { id: string; title: string }`, `type NotionDatabaseView = { databaseId: string; databaseTitle: string; titlePropertyName: string; items: NotionItemSummary[] }`, `isNotionConfigured(): boolean`, `listSharedDatabases(): Promise<NotionDatabaseSummary[]>`, `getDatabaseItems(databaseId: string): Promise<NotionDatabaseView | null>`, `createItem(params: { databaseId: string; titlePropertyName: string; title: string }): Promise<void>`, `renameItem(params: { pageId: string; titlePropertyName: string; newTitle: string }): Promise<void>` — 모두 `lib/notion/notionClient.ts`. Task 2~5가 이 함수들을 사용한다.

- [ ] **Step 1: `@notionhq/client` 설치**

Run: `npm install @notionhq/client`
Expected: `package.json`/`package-lock.json`에 `@notionhq/client`가 추가됨. 정확한 버전은 npm이 설치 시점의 최신 안정 버전으로 결정하도록 둔다(하드코딩하지 않음).

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/notion/notionClient.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { searchMock, databasesRetrieveMock, databasesQueryMock, pagesCreateMock, pagesUpdateMock } =
  vi.hoisted(() => ({
    searchMock: vi.fn(),
    databasesRetrieveMock: vi.fn(),
    databasesQueryMock: vi.fn(),
    pagesCreateMock: vi.fn(),
    pagesUpdateMock: vi.fn(),
  }));

vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: searchMock,
    databases: {
      retrieve: databasesRetrieveMock,
      query: databasesQueryMock,
    },
    pages: {
      create: pagesCreateMock,
      update: pagesUpdateMock,
    },
  })),
}));

import {
  isNotionConfigured,
  listSharedDatabases,
  getDatabaseItems,
  createItem,
  renameItem,
} from "./notionClient";

describe("notionClient", () => {
  const originalEnv = process.env.NOTION_API_KEY;

  beforeEach(() => {
    searchMock.mockReset();
    databasesRetrieveMock.mockReset();
    databasesQueryMock.mockReset();
    pagesCreateMock.mockReset();
    pagesUpdateMock.mockReset();
    process.env.NOTION_API_KEY = "test-notion-key";
  });

  afterEach(() => {
    process.env.NOTION_API_KEY = originalEnv;
  });

  it("isNotionConfigured은 NOTION_API_KEY 존재 여부를 반환한다", () => {
    expect(isNotionConfigured()).toBe(true);
    delete process.env.NOTION_API_KEY;
    expect(isNotionConfigured()).toBe(false);
  });

  it("설정되지 않은 경우 listSharedDatabases는 빈 배열을 반환한다", async () => {
    delete process.env.NOTION_API_KEY;

    const result = await listSharedDatabases();

    expect(result).toEqual([]);
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("공유된 데이터베이스 목록을 반환한다", async () => {
    searchMock.mockResolvedValue({
      results: [{ id: "db-1", title: [{ plain_text: "할 일 목록" }] }],
    });

    const result = await listSharedDatabases();

    expect(searchMock).toHaveBeenCalledWith({
      filter: { property: "object", value: "database" },
    });
    expect(result).toEqual([{ id: "db-1", title: "할 일 목록" }]);
  });

  it("설정되지 않은 경우 getDatabaseItems는 null을 반환한다", async () => {
    delete process.env.NOTION_API_KEY;

    const result = await getDatabaseItems("db-1");

    expect(result).toBeNull();
  });

  it("데이터베이스 항목 목록을 title 속성 이름과 함께 반환한다", async () => {
    databasesRetrieveMock.mockResolvedValue({
      title: [{ plain_text: "할 일 목록" }],
      properties: {
        이름: { type: "title" },
        상태: { type: "select" },
      },
    });
    databasesQueryMock.mockResolvedValue({
      results: [{ id: "page-1", properties: { 이름: { title: [{ plain_text: "첫 항목" }] } } }],
    });

    const result = await getDatabaseItems("db-1");

    expect(databasesRetrieveMock).toHaveBeenCalledWith({ database_id: "db-1" });
    expect(databasesQueryMock).toHaveBeenCalledWith({ database_id: "db-1" });
    expect(result).toEqual({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [{ id: "page-1", title: "첫 항목" }],
    });
  });

  it("존재하지 않는 데이터베이스 ID는 null을 반환한다 (404)", async () => {
    databasesRetrieveMock.mockRejectedValue({ status: 404 });

    const result = await getDatabaseItems("missing-db");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    databasesRetrieveMock.mockRejectedValue({ status: 401 });

    await expect(getDatabaseItems("db-1")).rejects.toBeTruthy();
  });

  it("설정되지 않은 경우 createItem은 에러를 던진다", async () => {
    delete process.env.NOTION_API_KEY;

    await expect(
      createItem({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" })
    ).rejects.toThrow();
  });

  it("createItem은 지정한 title 속성으로 페이지를 생성한다", async () => {
    pagesCreateMock.mockResolvedValue({});

    await createItem({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(pagesCreateMock).toHaveBeenCalledWith({
      parent: { database_id: "db-1" },
      properties: {
        이름: { title: [{ text: { content: "새 항목" } }] },
      },
    });
  });

  it("renameItem은 title 속성만 수정한다", async () => {
    pagesUpdateMock.mockResolvedValue({});

    await renameItem({ pageId: "page-1", titlePropertyName: "이름", newTitle: "수정된 항목" });

    expect(pagesUpdateMock).toHaveBeenCalledWith({
      page_id: "page-1",
      properties: {
        이름: { title: [{ text: { content: "수정된 항목" } }] },
      },
    });
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/notion/notionClient.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`lib/notion/notionClient.ts`:
```ts
import { Client } from "@notionhq/client";

export type NotionDatabaseSummary = {
  id: string;
  title: string;
};

export type NotionItemSummary = {
  id: string;
  title: string;
};

export type NotionDatabaseView = {
  databaseId: string;
  databaseTitle: string;
  titlePropertyName: string;
  items: NotionItemSummary[];
};

type NotionRichTextPart = { plain_text?: string };

function getNotionClient(): Client | null {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Client({ auth: apiKey });
}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY);
}

function joinRichText(richText: NotionRichTextPart[] | undefined): string {
  return richText?.map((part) => part.plain_text ?? "").join("") || "(제목 없음)";
}

function findTitlePropertyName(properties: Record<string, { type?: string }>): string {
  const entry = Object.entries(properties).find(([, value]) => value.type === "title");
  return entry ? entry[0] : "Name";
}

function extractErrorStatus(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : 0;
}

export async function listSharedDatabases(): Promise<NotionDatabaseSummary[]> {
  const notion = getNotionClient();
  if (!notion) {
    return [];
  }

  const response = await notion.search({
    filter: { property: "object", value: "database" },
  });

  return response.results.map((result) => {
    const database = result as unknown as {
      id: string;
      title?: NotionRichTextPart[];
    };
    return {
      id: database.id,
      title: joinRichText(database.title),
    };
  });
}

export async function getDatabaseItems(databaseId: string): Promise<NotionDatabaseView | null> {
  const notion = getNotionClient();
  if (!notion) {
    return null;
  }

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const databaseData = database as unknown as {
      title?: NotionRichTextPart[];
      properties: Record<string, { type?: string }>;
    };
    const titlePropertyName = findTitlePropertyName(databaseData.properties);

    const queryResponse = await notion.databases.query({ database_id: databaseId });
    const items: NotionItemSummary[] = queryResponse.results.map((page) => {
      const pageData = page as unknown as {
        id: string;
        properties: Record<string, { title?: NotionRichTextPart[] }>;
      };
      const titleProperty = pageData.properties[titlePropertyName];
      return {
        id: pageData.id,
        title: joinRichText(titleProperty?.title),
      };
    });

    return {
      databaseId,
      databaseTitle: joinRichText(databaseData.title),
      titlePropertyName,
      items,
    };
  } catch (error) {
    if (extractErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function createItem(params: {
  databaseId: string;
  titlePropertyName: string;
  title: string;
}): Promise<void> {
  const notion = getNotionClient();
  if (!notion) {
    throw new Error("Notion이 연동되어 있지 않습니다.");
  }

  await notion.pages.create({
    parent: { database_id: params.databaseId },
    properties: {
      [params.titlePropertyName]: {
        title: [{ text: { content: params.title } }],
      },
    },
  });
}

export async function renameItem(params: {
  pageId: string;
  titlePropertyName: string;
  newTitle: string;
}): Promise<void> {
  const notion = getNotionClient();
  if (!notion) {
    throw new Error("Notion이 연동되어 있지 않습니다.");
  }

  await notion.pages.update({
    page_id: params.pageId,
    properties: {
      [params.titlePropertyName]: {
        title: [{ text: { content: params.newTitle } }],
      },
    },
  });
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/notion/notionClient.test.ts`
Expected: PASS (11개 테스트 모두 통과)

- [ ] **Step 6: 환경변수 예시 추가**

`.env.local.example`에 아래 줄을 추가 (기존 내용 유지):
```
NOTION_API_KEY=
```

- [ ] **Step 7: README에 Notion 연동 설정 섹션 추가**

`README.md`의 "### Google 연동 시 알아둘 점" 섹션 뒤, "## GitHub / Vercel 연결" 섹션 앞에 아래 섹션을 추가:
```markdown
## Notion 연동 설정

1. https://www.notion.so/my-integrations 에서 "새 통합 만들기"로 Internal
   Integration 생성 (이름 예: "개인 업무 대시보드")
2. 생성된 "Internal Integration Secret" 값을 복사해 `.env.local`의
   `NOTION_API_KEY`에 입력
3. Notion에서 대시보드에 표시하고 싶은 데이터베이스를 열고, 우측 상단 "..."
   메뉴 > "연결 추가"(Add connections)에서 2번에서 만든 Integration을 선택해
   공유 (이 단계는 API로 자동화할 수 없으며, 대시보드에 보이길 원하는
   데이터베이스마다 반복해야 함)
4. 공유하지 않은 데이터베이스는 대시보드에 나타나지 않음 — 새 데이터베이스를
   추가하고 싶다면 3번 과정을 반복
```

`README.md`의 "## GitHub / Vercel 연결" 섹션 3번 항목(Vercel Environment Variables 등록 목록)을 아래로 교체해 `NOTION_API_KEY`를 포함시킨다:
```markdown
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NOTION_API_KEY`).
   `GOOGLE_REDIRECT_URI`는 실제 배포 도메인의 콜백 URL로 설정할 것
   (`https://<Vercel 도메인>/api/auth/google/callback`)
```

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json lib/notion/notionClient.ts lib/notion/notionClient.test.ts .env.local.example README.md
git commit -m "feat: Notion API 래퍼와 연동 설정 문서 추가"
```

---

### Task 2: 데이터베이스 목록 페이지 UI

**Files:**
- Modify: `app/notion/page.tsx`
- Create: `app/notion/page.test.tsx`
- Delete: `app/placeholder-pages.test.tsx`

**Interfaces:**
- Consumes: `isNotionConfigured`, `listSharedDatabases`, `type NotionDatabaseSummary` (Task 1)
- Produces: `/notion` 페이지가 실제 Notion 데이터베이스 목록을 보여주는 Server Component가 됨. Task 3이 각 데이터베이스로 이동하는 링크(`/notion/{id}`)를 소비한다.

**참고:** `app/placeholder-pages.test.tsx`는 Gmail(2단계)과 Drive(3단계) 계획에서 각자의 항목을 이미 제거해, 현재 Notion 테스트 1개만 남아 있다. 이번 태스크에서 Notion도 실제 페이지가 되므로, 더 이상 테스트할 "빈 라우트"가 없다 — 파일 전체를 삭제한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/notion/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import NotionPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { isNotionConfiguredMock, listSharedDatabasesMock } = vi.hoisted(() => ({
  isNotionConfiguredMock: vi.fn(),
  listSharedDatabasesMock: vi.fn(),
}));

vi.mock("@/lib/notion/notionClient", () => ({
  isNotionConfigured: isNotionConfiguredMock,
  listSharedDatabases: listSharedDatabasesMock,
}));

async function renderNotionPage() {
  const element = await NotionPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("NotionPage", () => {
  beforeEach(() => {
    isNotionConfiguredMock.mockReset();
    listSharedDatabasesMock.mockReset();
  });

  it("설정되지 않은 경우 환경변수 설정 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(false);

    await renderNotionPage();

    expect(
      screen.getByText(
        "Notion 연동이 설정되지 않았습니다. 관리자가 NOTION_API_KEY 환경변수를 설정해야 합니다."
      )
    ).toBeInTheDocument();
    expect(listSharedDatabasesMock).not.toHaveBeenCalled();
  });

  it("설정되었지만 공유된 데이터베이스가 없으면 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([]);

    await renderNotionPage();

    expect(
      screen.getByText(
        "공유된 데이터베이스가 없습니다. Notion에서 사용할 데이터베이스를 열고 이 Integration과 공유해주세요."
      )
    ).toBeInTheDocument();
  });

  it("공유된 데이터베이스 목록을 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([{ id: "db-1", title: "할 일 목록" }]);

    await renderNotionPage();

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /할 일 목록/ })).toHaveAttribute(
      "href",
      "/notion/db-1"
    );
  });

  it("목록 조회가 실패하면 문제 안내를 보여준다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockRejectedValue(new Error("invalid token"));

    await renderNotionPage();

    expect(
      screen.getByText("Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.")
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/notion/page.test.tsx`
Expected: FAIL — 현재 `app/notion/page.tsx`는 플레이스홀더 문구만 보여줌.

- [ ] **Step 3: `app/notion/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { isNotionConfigured, listSharedDatabases } from "@/lib/notion/notionClient";

export default async function NotionPage() {
  const configured = isNotionConfigured();

  let databases: Awaited<ReturnType<typeof listSharedDatabases>> = [];
  let loadError = false;

  if (configured) {
    try {
      databases = await listSharedDatabases();
    } catch {
      loadError = true;
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">Notion</h1>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동이 설정되지 않았습니다. 관리자가 NOTION_API_KEY 환경변수를
              설정해야 합니다.
            </p>
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        ) : databases.length === 0 ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              공유된 데이터베이스가 없습니다. Notion에서 사용할 데이터베이스를 열고
              이 Integration과 공유해주세요.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {databases.map((database) => (
              <li key={database.id}>
                <Link
                  href={`/notion/${database.id}`}
                  className="block px-4 py-3 hover:bg-neutral-800"
                >
                  <p className="text-sm font-medium text-neutral-50">{database.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/notion/page.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: `app/placeholder-pages.test.tsx` 삭제**

```bash
rm app/placeholder-pages.test.tsx
```

- [ ] **Step 6: 전체 테스트로 통합 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 테스트 회귀 없음)

- [ ] **Step 7: 커밋**

```bash
git add -A app/notion/page.tsx app/notion/page.test.tsx app/placeholder-pages.test.tsx
git commit -m "feat: Notion 데이터베이스 목록 페이지를 실제 데이터로 연결"
```

---

### Task 3: 데이터베이스 항목 조회 페이지 UI

**Files:**
- Create: `app/notion/[id]/page.tsx`
- Test: `app/notion/[id]/page.test.tsx`

**Interfaces:**
- Consumes: `getDatabaseItems`, `type NotionDatabaseView` (Task 1)
- Produces: `/notion/[id]` 페이지가 데이터베이스 항목 목록을 보여주는 Server Component가 됨. Task 4가 이 페이지에 새 항목 추가 폼을, Task 5가 항목별 이름변경 UI를 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/notion/[id]/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import NotionDatabasePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { getDatabaseItemsMock } = vi.hoisted(() => ({
  getDatabaseItemsMock: vi.fn(),
}));

vi.mock("@/lib/notion/notionClient", () => ({
  getDatabaseItems: getDatabaseItemsMock,
}));

async function renderPage(id: string) {
  const element = await NotionDatabasePage({ params: { id } });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("NotionDatabasePage", () => {
  beforeEach(() => {
    getDatabaseItemsMock.mockReset();
  });

  it("데이터베이스 제목과 항목 목록을 보여준다", async () => {
    getDatabaseItemsMock.mockResolvedValue({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [{ id: "page-1", title: "첫 항목" }],
    });

    await renderPage("db-1");

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByText("첫 항목")).toBeInTheDocument();
  });

  it("항목이 없으면 안내 문구를 보여준다", async () => {
    getDatabaseItemsMock.mockResolvedValue({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [],
    });

    await renderPage("db-1");

    expect(screen.getByText("항목이 없습니다.")).toBeInTheDocument();
  });

  it("조회가 실패하면 문제 안내를 보여준다", async () => {
    getDatabaseItemsMock.mockRejectedValue(new Error("invalid token"));

    await renderPage("db-1");

    expect(
      screen.getByText("Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.")
    ).toBeInTheDocument();
  });
});
```

(`getDatabaseItems`가 `null`을 반환해 `notFound()`가 호출되는 경로는 Next.js의 특수 예외를 던지는 동작이라 이 파일에서 단위 테스트하지 않는다 — Gmail/Drive 상세 페이지와 동일한 이유로, 전체 테스트 스위트와 빌드 통과로 회귀만 확인한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/notion/[id]/page.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 페이지 작성**

`app/notion/[id]/page.tsx`:
```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getDatabaseItems } from "@/lib/notion/notionClient";

export default async function NotionDatabasePage({ params }: { params: { id: string } }) {
  let view;
  try {
    view = await getDatabaseItems(params.id);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!view) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.databaseTitle}</h1>

        {view.items.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">항목이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-neutral-50">{item.title}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/notion/[id]/page.test.tsx`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 5: 전체 테스트 및 빌드로 통합 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 6: 커밋**

```bash
git add app/notion/[id]/page.tsx app/notion/[id]/page.test.tsx
git commit -m "feat: Notion 데이터베이스 항목 조회 페이지 추가"
```

---

### Task 4: 새 항목 추가 기능

**Files:**
- Create: `app/notion/actions.ts`
- Test: `app/notion/actions.test.ts`
- Create: `app/notion/CreateItemForm.tsx`
- Test: `app/notion/CreateItemForm.test.tsx`
- Modify: `app/notion/[id]/page.tsx`

**Interfaces:**
- Consumes: `createItem` (Task 1), `requireAdmin` (2단계, `lib/auth/requireAdmin.ts`)
- Produces: `createItemAction(params: { databaseId: string; titlePropertyName: string; title: string }): Promise<void>` (`app/notion/actions.ts`), `CreateItemForm` 컴포넌트(props `{ databaseId: string; titlePropertyName: string }`, `app/notion/CreateItemForm.tsx`). Task 5가 `app/notion/actions.ts`에 함수를 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성 — Server Action**

`app/notion/actions.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, createItemMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  createItemMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  createItem: createItemMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createItemAction } from "./actions";

describe("createItemAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createItemMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("requireAdmin을 호출한다", async () => {
    createItemMock.mockResolvedValue(undefined);

    await createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createItem을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(
      createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" })
    ).rejects.toThrow();
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("빈 제목으로는 createItem을 호출하지 않는다", async () => {
    await expect(
      createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "   " })
    ).rejects.toThrow("제목을 입력해주세요.");
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("정상적인 생성은 createItem과 revalidatePath를 호출한다", async () => {
    createItemMock.mockResolvedValue(undefined);

    await createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(createItemMock).toHaveBeenCalledWith({
      databaseId: "db-1",
      titlePropertyName: "이름",
      title: "새 항목",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notion/db-1");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/notion/actions.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Server Action 작성**

`app/notion/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createItem } from "@/lib/notion/notionClient";

export async function createItemAction(params: {
  databaseId: string;
  titlePropertyName: string;
  title: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.title.trim()) {
    throw new Error("제목을 입력해주세요.");
  }

  await createItem({
    databaseId: params.databaseId,
    titlePropertyName: params.titlePropertyName,
    title: params.title.trim(),
  });

  revalidatePath(`/notion/${params.databaseId}`);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/notion/actions.test.ts`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: 실패하는 테스트 작성 — 추가 폼**

`app/notion/CreateItemForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CreateItemForm } from "./CreateItemForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { createItemActionMock } = vi.hoisted(() => ({
  createItemActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  createItemAction: createItemActionMock,
}));

describe("CreateItemForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    createItemActionMock.mockReset();
  });

  it("제목을 입력하고 제출하면 생성 액션을 호출한다", async () => {
    createItemActionMock.mockResolvedValue(undefined);

    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    fireEvent.change(screen.getByLabelText("새 항목 제목"), { target: { value: "새 항목" } });
    fireEvent.click(screen.getByRole("button", { name: "새 항목 추가" }));

    await waitFor(() =>
      expect(createItemActionMock).toHaveBeenCalledWith({
        databaseId: "db-1",
        titlePropertyName: "이름",
        title: "새 항목",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("제목이 비어 있으면 추가 버튼이 비활성화된다", () => {
    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    expect(screen.getByRole("button", { name: "새 항목 추가" })).toBeDisabled();
  });

  it("생성에 실패하면 한글 에러 메시지를 보여준다", async () => {
    createItemActionMock.mockRejectedValue(new Error("create failed"));

    render(<CreateItemForm databaseId="db-1" titlePropertyName="이름" />);

    fireEvent.change(screen.getByLabelText("새 항목 제목"), { target: { value: "새 항목" } });
    fireEvent.click(screen.getByRole("button", { name: "새 항목 추가" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "항목 추가에 실패했습니다. NOTION_API_KEY 값을 확인해주세요."
    );
    expect(screen.getByRole("button", { name: "새 항목 추가" })).not.toBeDisabled();
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run app/notion/CreateItemForm.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 7: 추가 폼 구현**

`app/notion/CreateItemForm.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createItemAction } from "./actions";

export function CreateItemForm({
  databaseId,
  titlePropertyName,
}: {
  databaseId: string;
  titlePropertyName: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createItemAction({ databaseId, titlePropertyName, title });
      setTitle("");
      router.refresh();
    } catch {
      setErrorMessage("항목 추가에 실패했습니다. NOTION_API_KEY 값을 확인해주세요.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="새 항목 제목"
        aria-label="새 항목 제목"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-50"
      />
      <button
        type="submit"
        disabled={isCreating || !title.trim()}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "새 항목 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run app/notion/CreateItemForm.test.tsx`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 9: `app/notion/[id]/page.tsx`에 추가 폼 연결**

`app/notion/[id]/page.tsx` 전체를 아래로 교체 (Task 3과 비교해 `CreateItemForm` import와 `<h1>` 다음의 `<CreateItemForm />` 한 줄만 추가됨, 나머지는 동일):
```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getDatabaseItems } from "@/lib/notion/notionClient";
import { CreateItemForm } from "../CreateItemForm";

export default async function NotionDatabasePage({ params }: { params: { id: string } }) {
  let view;
  try {
    view = await getDatabaseItems(params.id);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!view) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.databaseTitle}</h1>

        <CreateItemForm databaseId={view.databaseId} titlePropertyName={view.titlePropertyName} />

        {view.items.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">항목이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-neutral-50">{item.title}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 10: 전체 테스트 및 빌드로 통합 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add app/notion/actions.ts app/notion/actions.test.ts app/notion/CreateItemForm.tsx app/notion/CreateItemForm.test.tsx app/notion/[id]/page.tsx
git commit -m "feat: Notion 새 항목 추가 기능 추가"
```

---

### Task 5: 항목 이름변경 기능

**Files:**
- Modify: `app/notion/actions.ts`
- Modify: `app/notion/actions.test.ts`
- Create: `app/notion/ItemRowActions.tsx`
- Test: `app/notion/ItemRowActions.test.tsx`
- Modify: `app/notion/[id]/page.tsx`

**Interfaces:**
- Consumes: `renameItem` (Task 1), `requireAdmin` (2단계)
- Produces: `renameItemAction(params: { pageId: string; databaseId: string; titlePropertyName: string; newTitle: string }): Promise<void>` (`app/notion/actions.ts`에 추가), `ItemRowActions` 컴포넌트(props `{ pageId: string; databaseId: string; titlePropertyName: string; currentTitle: string }`, `app/notion/ItemRowActions.tsx`). Notion 연동 기능이 이 계획 안에서 완결된다 (삭제 기능은 스펙에 없으므로 만들지 않는다).

- [ ] **Step 1: `app/notion/actions.ts`에 이름변경 액션 추가**

기존 `createItemAction` 함수 뒤에 아래 함수를 추가:
```ts

export async function renameItemAction(params: {
  pageId: string;
  databaseId: string;
  titlePropertyName: string;
  newTitle: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.newTitle.trim()) {
    throw new Error("제목을 입력해주세요.");
  }

  await renameItem({
    pageId: params.pageId,
    titlePropertyName: params.titlePropertyName,
    newTitle: params.newTitle.trim(),
  });

  revalidatePath(`/notion/${params.databaseId}`);
}
```

`app/notion/actions.ts` 맨 위의 import 문을 아래로 교체 (`renameItem` 추가):
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createItem, renameItem } from "@/lib/notion/notionClient";
```

- [ ] **Step 2: `app/notion/actions.test.ts`에 이름변경 테스트 추가**

파일 맨 위 `vi.mock("@/lib/notion/notionClient", ...)` 블록을 아래로 교체 (`renameItem` 목 추가):
```ts
const { requireAdminMock, createItemMock, renameItemMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  createItemMock: vi.fn(),
  renameItemMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  createItem: createItemMock,
  renameItem: renameItemMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createItemAction, renameItemAction } from "./actions";
```

기존 `beforeEach` 블록을 아래로 교체 (`renameItemMock.mockReset()` 추가):
```ts
  beforeEach(() => {
    requireAdminMock.mockReset();
    createItemMock.mockReset();
    renameItemMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });
```

파일 맨 끝(마지막 `});` 바로 앞의 `describe("createItemAction", ...)` 블록이 끝나는 지점) 뒤에 새 `describe` 블록을 추가:
```ts

describe("renameItemAction", () => {
  it("requireAdmin을 호출한다", async () => {
    renameItemMock.mockResolvedValue(undefined);

    await renameItemAction({
      pageId: "page-1",
      databaseId: "db-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameItem을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(
      renameItemAction({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "수정된 항목",
      })
    ).rejects.toThrow();
    expect(renameItemMock).not.toHaveBeenCalled();
  });

  it("빈 제목으로는 renameItem을 호출하지 않는다", async () => {
    await expect(
      renameItemAction({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "   ",
      })
    ).rejects.toThrow("제목을 입력해주세요.");
    expect(renameItemMock).not.toHaveBeenCalled();
  });

  it("정상적인 이름 변경은 renameItem과 revalidatePath를 호출한다", async () => {
    renameItemMock.mockResolvedValue(undefined);

    await renameItemAction({
      pageId: "page-1",
      databaseId: "db-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });

    expect(renameItemMock).toHaveBeenCalledWith({
      pageId: "page-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notion/db-1");
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/notion/actions.test.ts`
Expected: FAIL — `renameItemAction`을 import할 수 없음.

- [ ] **Step 4: 테스트 통과 확인 (Step 1의 구현으로 이미 통과해야 함)**

Run: `npx vitest run app/notion/actions.test.ts`
Expected: PASS (8개 테스트 모두 통과 — 기존 4개 + 신규 4개)

- [ ] **Step 5: 실패하는 테스트 작성 — 이름변경 UI**

`app/notion/ItemRowActions.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ItemRowActions } from "./ItemRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameItemActionMock } = vi.hoisted(() => ({
  renameItemActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameItemAction: renameItemActionMock,
}));

describe("ItemRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameItemActionMock.mockReset();
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 액션을 호출한다", async () => {
    renameItemActionMock.mockResolvedValue(undefined);

    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 제목") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "수정된 제목" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameItemActionMock).toHaveBeenCalledWith({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "수정된 제목",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("빈 제목으로는 저장 버튼이 비활성화된다", () => {
    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 제목") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
  });

  it("이름 변경에 실패하면 한글 에러 메시지를 보여준다", async () => {
    renameItemActionMock.mockRejectedValue(new Error("rename failed"));

    render(
      <ItemRowActions
        pageId="page-1"
        databaseId="db-1"
        titlePropertyName="이름"
        currentTitle="원본 제목"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이름 변경에 실패했습니다. NOTION_API_KEY 값을 확인해주세요."
    );
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run app/notion/ItemRowActions.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 7: 이름변경 UI 구현**

`app/notion/ItemRowActions.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameItemAction } from "./actions";

export function ItemRowActions({
  pageId,
  databaseId,
  titlePropertyName,
  currentTitle,
}: {
  pageId: string;
  databaseId: string;
  titlePropertyName: string;
  currentTitle: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameItemAction({ pageId, databaseId, titlePropertyName, newTitle });
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다. NOTION_API_KEY 값을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            aria-label="새 제목"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newTitle.trim()}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewTitle(currentTitle);
            }}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-red-400">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setIsRenaming(true)}
        className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
      >
        이름변경
      </button>
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run app/notion/ItemRowActions.test.tsx`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 9: `app/notion/[id]/page.tsx`에 이름변경 UI 연결**

`app/notion/[id]/page.tsx`에서 `import` 목록에 `import { ItemRowActions } from "../ItemRowActions";`을 추가하고, 항목 목록을 렌더링하는 `<ul>` 블록 전체를 아래로 교체:
```tsx
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-neutral-50">{item.title}</p>
                <ItemRowActions
                  pageId={item.id}
                  databaseId={view.databaseId}
                  titlePropertyName={view.titlePropertyName}
                  currentTitle={item.title}
                />
              </li>
            ))}
          </ul>
```

- [ ] **Step 10: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add app/notion/actions.ts app/notion/actions.test.ts app/notion/ItemRowActions.tsx app/notion/ItemRowActions.test.tsx app/notion/[id]/page.tsx
git commit -m "feat: Notion 항목 이름변경 기능 추가"
```

---

### Task 6: 홈 카드 문구 업데이트 + 진행 현황

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음 (문구 변경만)
- Produces: 없음 (이 계획의 마지막 태스크)

- [ ] **Step 1: `app/page.tsx`의 Notion 카드 문구 업데이트**

`app/page.tsx` 전체를 아래로 교체 (Notion 카드의 `description`만 변경, 나머지는 동일):
```tsx
import { AppHeader } from "@/components/layout/AppHeader";
import { ServiceSummaryCard } from "@/components/dashboard/ServiceSummaryCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <ServiceSummaryCard
          title="Gmail"
          description="최근 메일을 확인하고 보낼 수 있습니다."
          href="/gmail"
        />
        <ServiceSummaryCard
          title="Google Drive"
          description="파일을 조회하고 업로드/관리할 수 있습니다."
          href="/drive"
        />
        <ServiceSummaryCard
          title="Notion"
          description="데이터베이스 항목을 확인하고 추가/수정할 수 있습니다."
          href="/notion"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `app/page.test.tsx` 업데이트**

`app/page.test.tsx` 전체를 아래로 교체 (첫 번째 테스트의 Notion 문구만 변경, 나머지는 동일):
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

describe("HomePage", () => {
  it("Gmail, Drive, Notion 요약 카드를 한글로 보여준다", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <HomePage />
      </ThemeProvider>
    );

    expect(screen.getByText("최근 메일을 확인하고 보낼 수 있습니다.")).toBeInTheDocument();
    expect(screen.getByText("파일을 조회하고 업로드/관리할 수 있습니다.")).toBeInTheDocument();
    expect(
      screen.getByText("데이터베이스 항목을 확인하고 추가/수정할 수 있습니다.")
    ).toBeInTheDocument();
  });

  it("각 요약 카드는 해당 서비스 페이지로 연결된다", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
        <HomePage />
      </ThemeProvider>
    );

    expect(screen.getByRole("link", { name: /Gmail/ })).toHaveAttribute("href", "/gmail");
    expect(screen.getByRole("link", { name: /Google Drive/ })).toHaveAttribute("href", "/drive");
    expect(screen.getByRole("link", { name: /Notion/ })).toHaveAttribute("href", "/notion");
  });
});
```

- [ ] **Step 3: README 진행 현황 업데이트**

`README.md`의 "## 진행 현황" 섹션을 아래로 교체:
```markdown
## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [x] 3단계: Google Drive 연동
- [x] 4단계: Notion 연동
- [ ] 5단계: 홈 화면 통합
```

- [ ] **Step 4: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 5: 커밋**

```bash
git add app/page.tsx app/page.test.tsx README.md
git commit -m "feat: 홈 화면 Notion 카드 문구 업데이트 및 진행 현황 갱신"
```
