# 개인 업무 대시보드 - 홈 화면 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 홈 화면(`/`)의 Gmail/Drive/Notion 카드가 정적 안내 문구 대신, 각 서비스의 최근 데이터(최근 메일 제목, 최근 파일 이름, 공유된 Notion 데이터베이스 제목)를 실시간으로 보여주도록 한다. 이 계획은 5단계 중 마지막이며, 1~4단계가 이미 `master`에 병합되어 있다.

**Architecture:** 스펙 §10이 명시한 대로 홈 페이지는 Gmail/Drive/Notion 세 서비스의 요약 데이터를 **병렬로**(`Promise.all`) 서버에서 가져온다. 새로운 API 래퍼나 Server Action은 만들지 않는다 — 이미 1~4단계에서 만든 조회 함수(`listRecentMessages`, `listFolder`, `listSharedDatabases` 등)를 그대로 재사용해 조합하기만 한다. 각 서비스의 "연결 안 됨"/"에러"/"설정 안 됨"/"공유된 것 없음" 상태(스펙 §9, §11)를 홈 카드 수준에서도 보여준다 — 지금까지는 각 서비스의 상세 페이지(`/gmail`, `/drive`, `/notion`)에서만 이 상태들을 보여줬다.

**Tech Stack:** 기존 스택 재사용 (신규 의존성 없음)

**Spec:** [docs/superpowers/specs/2026-08-30-personal-ops-dashboard-design.md](../specs/2026-08-30-personal-ops-dashboard-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다.
- 홈 페이지는 라이브 데이터를 읽으므로 `export const dynamic = "force-dynamic"`을 명시한다.
- 스펙 §10에 따라 세 서비스 요약을 `Promise.all`로 **병렬** 조회한다 — 순차적으로 하나씩 기다리지 않는다.
- 새로운 Server Action이나 데이터 변경 기능은 만들지 않는다 — 이 계획은 순수 조회(읽기)만 다룬다. 따라서 `requireAdmin()` 방어 심층화도 이 계획에서는 해당 사항 없음 (미들웨어 보호만으로 충분 — 쓰기 작업이 없으므로).
- 각 서비스 요약 카드는 최대 3개 항목만 미리보기로 보여준다 (`SUMMARY_ITEM_LIMIT = 3`).
- 기존 범용 `ServiceSummaryCard` 컴포넌트는 이 계획 완료 후 더 이상 쓰이지 않으므로 삭제한다 (죽은 코드를 남기지 않는다).

---

### Task 1: 홈 요약 데이터 조합 함수

**Files:**
- Create: `lib/dashboard/homeSummary.ts`
- Test: `lib/dashboard/homeSummary.test.ts`

**Interfaces:**
- Consumes: `isGoogleConnected`, `listRecentMessages` (2단계, `lib/google/gmailClient.ts`), `isGoogleConnected`, `listFolder` (3단계, `lib/google/driveClient.ts` — Gmail과 이름이 같은 별개 함수), `isNotionConfigured`, `listSharedDatabases` (4단계, `lib/notion/notionClient.ts`)
- Produces: `type GmailSummary = { state: "not_connected" } | { state: "error" } | { state: "ok"; subjects: string[] }`, `type DriveSummary = { state: "not_connected" } | { state: "error" } | { state: "ok"; names: string[] }`, `type NotionSummary = { state: "not_configured" } | { state: "empty" } | { state: "error" } | { state: "ok"; titles: string[] }`, `getGmailSummary(): Promise<GmailSummary>`, `getDriveSummary(): Promise<DriveSummary>`, `getNotionSummary(): Promise<NotionSummary>` — 모두 `lib/dashboard/homeSummary.ts`. Task 2, 3이 이 타입과 함수들을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/dashboard/homeSummary.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  gmailIsConnectedMock,
  listRecentMessagesMock,
  driveIsConnectedMock,
  listFolderMock,
  isNotionConfiguredMock,
  listSharedDatabasesMock,
} = vi.hoisted(() => ({
  gmailIsConnectedMock: vi.fn(),
  listRecentMessagesMock: vi.fn(),
  driveIsConnectedMock: vi.fn(),
  listFolderMock: vi.fn(),
  isNotionConfiguredMock: vi.fn(),
  listSharedDatabasesMock: vi.fn(),
}));

vi.mock("@/lib/google/gmailClient", () => ({
  isGoogleConnected: gmailIsConnectedMock,
  listRecentMessages: listRecentMessagesMock,
}));

vi.mock("@/lib/google/driveClient", () => ({
  isGoogleConnected: driveIsConnectedMock,
  listFolder: listFolderMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  isNotionConfigured: isNotionConfiguredMock,
  listSharedDatabases: listSharedDatabasesMock,
}));

import { getGmailSummary, getDriveSummary, getNotionSummary } from "./homeSummary";

describe("getGmailSummary", () => {
  beforeEach(() => {
    gmailIsConnectedMock.mockReset();
    listRecentMessagesMock.mockReset();
  });

  it("연결되어 있지 않으면 not_connected 상태를 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(false);

    const result = await getGmailSummary();

    expect(result).toEqual({ state: "not_connected" });
    expect(listRecentMessagesMock).not.toHaveBeenCalled();
  });

  it("연결되어 있으면 최근 메일 제목 목록을 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([
      { id: "1", subject: "제목1", from: "", date: "", snippet: "" },
      { id: "2", subject: "제목2", from: "", date: "", snippet: "" },
    ]);

    const result = await getGmailSummary();

    expect(listRecentMessagesMock).toHaveBeenCalledWith(3);
    expect(result).toEqual({ state: "ok", subjects: ["제목1", "제목2"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockRejectedValue(new Error("token expired"));

    const result = await getGmailSummary();

    expect(result).toEqual({ state: "error" });
  });
});

describe("getDriveSummary", () => {
  beforeEach(() => {
    driveIsConnectedMock.mockReset();
    listFolderMock.mockReset();
  });

  it("연결되어 있지 않으면 not_connected 상태를 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(false);

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "not_connected" });
    expect(listFolderMock).not.toHaveBeenCalled();
  });

  it("연결되어 있으면 최근 파일 이름 목록을 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "f1", name: "문서1.txt", isFolder: false, modifiedTime: "", size: null },
        { id: "f2", name: "문서2.txt", isFolder: false, modifiedTime: "", size: null },
      ],
    });

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "ok", names: ["문서1.txt", "문서2.txt"] });
  });

  it("파일이 3개를 초과하면 처음 3개만 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "f1", name: "파일1", isFolder: false, modifiedTime: "", size: null },
        { id: "f2", name: "파일2", isFolder: false, modifiedTime: "", size: null },
        { id: "f3", name: "파일3", isFolder: false, modifiedTime: "", size: null },
        { id: "f4", name: "파일4", isFolder: false, modifiedTime: "", size: null },
        { id: "f5", name: "파일5", isFolder: false, modifiedTime: "", size: null },
      ],
    });

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "ok", names: ["파일1", "파일2", "파일3"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockRejectedValue(new Error("token expired"));

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "error" });
  });
});

describe("getNotionSummary", () => {
  beforeEach(() => {
    isNotionConfiguredMock.mockReset();
    listSharedDatabasesMock.mockReset();
  });

  it("설정되지 않은 경우 not_configured 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(false);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "not_configured" });
    expect(listSharedDatabasesMock).not.toHaveBeenCalled();
  });

  it("공유된 데이터베이스가 없으면 empty 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "empty" });
  });

  it("공유된 데이터베이스가 있으면 제목 목록을 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([
      { id: "db-1", title: "할 일 목록" },
      { id: "db-2", title: "프로젝트" },
    ]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "ok", titles: ["할 일 목록", "프로젝트"] });
  });

  it("데이터베이스가 3개를 초과하면 처음 3개만 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([
      { id: "db-1", title: "DB1" },
      { id: "db-2", title: "DB2" },
      { id: "db-3", title: "DB3" },
      { id: "db-4", title: "DB4" },
    ]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "ok", titles: ["DB1", "DB2", "DB3"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockRejectedValue(new Error("invalid token"));

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "error" });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/dashboard/homeSummary.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

`lib/dashboard/homeSummary.ts`:
```ts
import { isGoogleConnected as isGmailConnected, listRecentMessages } from "@/lib/google/gmailClient";
import { isGoogleConnected as isDriveConnected, listFolder } from "@/lib/google/driveClient";
import { isNotionConfigured, listSharedDatabases } from "@/lib/notion/notionClient";

const SUMMARY_ITEM_LIMIT = 3;

export type GmailSummary =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; subjects: string[] };

export type DriveSummary =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; names: string[] };

export type NotionSummary =
  | { state: "not_configured" }
  | { state: "empty" }
  | { state: "error" }
  | { state: "ok"; titles: string[] };

export async function getGmailSummary(): Promise<GmailSummary> {
  const connected = await isGmailConnected();
  if (!connected) {
    return { state: "not_connected" };
  }

  try {
    const messages = await listRecentMessages(SUMMARY_ITEM_LIMIT);
    return { state: "ok", subjects: messages.map((message) => message.subject) };
  } catch {
    return { state: "error" };
  }
}

export async function getDriveSummary(): Promise<DriveSummary> {
  const connected = await isDriveConnected();
  if (!connected) {
    return { state: "not_connected" };
  }

  try {
    const view = await listFolder();
    const names = (view?.files ?? []).slice(0, SUMMARY_ITEM_LIMIT).map((file) => file.name);
    return { state: "ok", names };
  } catch {
    return { state: "error" };
  }
}

export async function getNotionSummary(): Promise<NotionSummary> {
  const configured = isNotionConfigured();
  if (!configured) {
    return { state: "not_configured" };
  }

  try {
    const databases = await listSharedDatabases();
    if (databases.length === 0) {
      return { state: "empty" };
    }
    return {
      state: "ok",
      titles: databases.slice(0, SUMMARY_ITEM_LIMIT).map((database) => database.title),
    };
  } catch {
    return { state: "error" };
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/dashboard/homeSummary.test.ts`
Expected: PASS (13개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/dashboard/homeSummary.ts lib/dashboard/homeSummary.test.ts
git commit -m "feat: 홈 화면용 서비스 요약 데이터 조합 함수 추가"
```

---

### Task 2: 서비스 요약 카드 컴포넌트 3종

**Files:**
- Create: `components/dashboard/GmailSummaryCard.tsx`
- Test: `components/dashboard/GmailSummaryCard.test.tsx`
- Create: `components/dashboard/DriveSummaryCard.tsx`
- Test: `components/dashboard/DriveSummaryCard.test.tsx`
- Create: `components/dashboard/NotionSummaryCard.tsx`
- Test: `components/dashboard/NotionSummaryCard.test.tsx`

**Interfaces:**
- Consumes: `type GmailSummary`, `type DriveSummary`, `type NotionSummary` (Task 1)
- Produces: `GmailSummaryCard({ summary: GmailSummary })`, `DriveSummaryCard({ summary: DriveSummary })`, `NotionSummaryCard({ summary: NotionSummary })` — 순수 프레젠테이션 컴포넌트(서버/클라이언트 구분 없이 동작하는 일반 함수 컴포넌트), 각각 `components/dashboard/`. Task 3이 홈 페이지에서 이 세 컴포넌트를 사용한다.

이 세 컴포넌트는 구조가 동일하고(같은 카드 형태, 상태별 분기만 다름) 서로 독립적으로 승인/반려될 이유가 없으므로 한 태스크로 묶는다.

- [ ] **Step 1: 실패하는 테스트 작성 — Gmail**

`components/dashboard/GmailSummaryCard.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GmailSummaryCard } from "./GmailSummaryCard";

describe("GmailSummaryCard", () => {
  it("연결되지 않은 경우 연결 안내를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "not_connected" }} />);

    expect(screen.getByText("Google 계정 연결이 필요합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gmail/ })).toHaveAttribute("href", "/gmail");
  });

  it("조회가 실패하면 재연결 안내를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "error" }} />);

    expect(
      screen.getByText("연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });

  it("받은 메일이 없으면 안내 문구를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "ok", subjects: [] }} />);

    expect(screen.getByText("받은 메일이 없습니다.")).toBeInTheDocument();
  });

  it("최근 메일 제목 목록을 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "ok", subjects: ["제목1", "제목2"] }} />);

    expect(screen.getByText("제목1")).toBeInTheDocument();
    expect(screen.getByText("제목2")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/dashboard/GmailSummaryCard.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: Gmail 카드 구현**

`components/dashboard/GmailSummaryCard.tsx`:
```tsx
import Link from "next/link";
import type { GmailSummary } from "@/lib/dashboard/homeSummary";

export function GmailSummaryCard({ summary }: { summary: GmailSummary }) {
  return (
    <Link
      href="/gmail"
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">Gmail</h2>
      {summary.state === "not_connected" ? (
        <p className="mt-2 text-sm text-neutral-400">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-2 text-sm text-neutral-400">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.subjects.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">받은 메일이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summary.subjects.map((subject, index) => (
            <li key={index} className="truncate text-sm text-neutral-300">
              {subject}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/dashboard/GmailSummaryCard.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: 실패하는 테스트 작성 — Drive**

`components/dashboard/DriveSummaryCard.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DriveSummaryCard } from "./DriveSummaryCard";

describe("DriveSummaryCard", () => {
  it("연결되지 않은 경우 연결 안내를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "not_connected" }} />);

    expect(screen.getByText("Google 계정 연결이 필요합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Google Drive/ })).toHaveAttribute("href", "/drive");
  });

  it("조회가 실패하면 재연결 안내를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "error" }} />);

    expect(
      screen.getByText("연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });

  it("파일이 없으면 안내 문구를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "ok", names: [] }} />);

    expect(screen.getByText("파일이 없습니다.")).toBeInTheDocument();
  });

  it("최근 파일 이름 목록을 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "ok", names: ["문서1.txt", "문서2.txt"] }} />);

    expect(screen.getByText("문서1.txt")).toBeInTheDocument();
    expect(screen.getByText("문서2.txt")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: 테스트 실패 확인**

Run: `npx vitest run components/dashboard/DriveSummaryCard.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 7: Drive 카드 구현**

`components/dashboard/DriveSummaryCard.tsx`:
```tsx
import Link from "next/link";
import type { DriveSummary } from "@/lib/dashboard/homeSummary";

export function DriveSummaryCard({ summary }: { summary: DriveSummary }) {
  return (
    <Link
      href="/drive"
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">Google Drive</h2>
      {summary.state === "not_connected" ? (
        <p className="mt-2 text-sm text-neutral-400">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-2 text-sm text-neutral-400">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.names.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-400">파일이 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summary.names.map((name, index) => (
            <li key={index} className="truncate text-sm text-neutral-300">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run components/dashboard/DriveSummaryCard.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 9: 실패하는 테스트 작성 — Notion**

`components/dashboard/NotionSummaryCard.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotionSummaryCard } from "./NotionSummaryCard";

describe("NotionSummaryCard", () => {
  it("설정되지 않은 경우 안내를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "not_configured" }} />);

    expect(screen.getByText("Notion 연동이 설정되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Notion/ })).toHaveAttribute("href", "/notion");
  });

  it("조회가 실패하면 환경변수 확인 안내를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "error" }} />);

    expect(screen.getByText("NOTION_API_KEY 값을 확인해주세요.")).toBeInTheDocument();
  });

  it("공유된 데이터베이스가 없으면 안내 문구를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "empty" }} />);

    expect(screen.getByText("공유된 데이터베이스가 없습니다.")).toBeInTheDocument();
  });

  it("공유된 데이터베이스 제목 목록을 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "ok", titles: ["할 일 목록", "프로젝트"] }} />);

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
  });
});
```

- [ ] **Step 10: 테스트 실패 확인**

Run: `npx vitest run components/dashboard/NotionSummaryCard.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 11: Notion 카드 구현**

`components/dashboard/NotionSummaryCard.tsx`:
```tsx
import Link from "next/link";
import type { NotionSummary } from "@/lib/dashboard/homeSummary";

export function NotionSummaryCard({ summary }: { summary: NotionSummary }) {
  return (
    <Link
      href="/notion"
      className="block rounded-xl border border-neutral-800 bg-neutral-900 p-5 transition-colors hover:border-neutral-600"
    >
      <h2 className="text-base font-semibold text-neutral-50">Notion</h2>
      {summary.state === "not_configured" ? (
        <p className="mt-2 text-sm text-neutral-400">Notion 연동이 설정되지 않았습니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-2 text-sm text-neutral-400">NOTION_API_KEY 값을 확인해주세요.</p>
      ) : summary.state === "empty" ? (
        <p className="mt-2 text-sm text-neutral-400">공유된 데이터베이스가 없습니다.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {summary.titles.map((title, index) => (
            <li key={index} className="truncate text-sm text-neutral-300">
              {title}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

- [ ] **Step 12: 테스트 통과 확인**

Run: `npx vitest run components/dashboard/NotionSummaryCard.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 13: 커밋**

```bash
git add components/dashboard/GmailSummaryCard.tsx components/dashboard/GmailSummaryCard.test.tsx components/dashboard/DriveSummaryCard.tsx components/dashboard/DriveSummaryCard.test.tsx components/dashboard/NotionSummaryCard.tsx components/dashboard/NotionSummaryCard.test.tsx
git commit -m "feat: 서비스별 요약 카드 컴포넌트(Gmail/Drive/Notion) 추가"
```

---

### Task 3: 홈 페이지 통합

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Delete: `components/dashboard/ServiceSummaryCard.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: `getGmailSummary`, `getDriveSummary`, `getNotionSummary` (Task 1), `GmailSummaryCard`, `DriveSummaryCard`, `NotionSummaryCard` (Task 2)
- Produces: 없음 (이 계획과 5단계 전체의 마지막 태스크)

- [ ] **Step 1: 실패하는 테스트 작성**

`app/page.test.tsx` 전체를 아래로 교체:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
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

const { getGmailSummaryMock, getDriveSummaryMock, getNotionSummaryMock } = vi.hoisted(() => ({
  getGmailSummaryMock: vi.fn(),
  getDriveSummaryMock: vi.fn(),
  getNotionSummaryMock: vi.fn(),
}));

vi.mock("@/lib/dashboard/homeSummary", () => ({
  getGmailSummary: getGmailSummaryMock,
  getDriveSummary: getDriveSummaryMock,
  getNotionSummary: getNotionSummaryMock,
}));

async function renderHomePage() {
  const element = await HomePage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("HomePage", () => {
  beforeEach(() => {
    getGmailSummaryMock.mockReset();
    getDriveSummaryMock.mockReset();
    getNotionSummaryMock.mockReset();
  });

  it("세 서비스의 요약 카드를 한글로 보여준다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "ok", subjects: ["첫 메일"] });
    getDriveSummaryMock.mockResolvedValue({ state: "ok", names: ["문서.txt"] });
    getNotionSummaryMock.mockResolvedValue({ state: "ok", titles: ["할 일 목록"] });

    await renderHomePage();

    expect(screen.getByText("첫 메일")).toBeInTheDocument();
    expect(screen.getByText("문서.txt")).toBeInTheDocument();
    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
  });

  it("각 요약 카드는 해당 서비스 페이지로 연결된다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "not_connected" });
    getDriveSummaryMock.mockResolvedValue({ state: "not_connected" });
    getNotionSummaryMock.mockResolvedValue({ state: "not_configured" });

    await renderHomePage();

    expect(screen.getByRole("link", { name: /Gmail/ })).toHaveAttribute("href", "/gmail");
    expect(screen.getByRole("link", { name: /Google Drive/ })).toHaveAttribute("href", "/drive");
    expect(screen.getByRole("link", { name: /Notion/ })).toHaveAttribute("href", "/notion");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — 현재 `app/page.tsx`는 정적 문구만 보여주는 동기 컴포넌트라 `HomePage()`를 함수로 호출할 수 없고, `@/lib/dashboard/homeSummary` 모듈도 없음.

- [ ] **Step 3: `app/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import { AppHeader } from "@/components/layout/AppHeader";
import { GmailSummaryCard } from "@/components/dashboard/GmailSummaryCard";
import { DriveSummaryCard } from "@/components/dashboard/DriveSummaryCard";
import { NotionSummaryCard } from "@/components/dashboard/NotionSummaryCard";
import { getGmailSummary, getDriveSummary, getNotionSummary } from "@/lib/dashboard/homeSummary";

export default async function HomePage() {
  const [gmailSummary, driveSummary, notionSummary] = await Promise.all([
    getGmailSummary(),
    getDriveSummary(),
    getNotionSummary(),
  ]);

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <GmailSummaryCard summary={gmailSummary} />
        <DriveSummaryCard summary={driveSummary} />
        <NotionSummaryCard summary={notionSummary} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 5: 이제 쓰이지 않는 `ServiceSummaryCard` 삭제**

```bash
rm components/dashboard/ServiceSummaryCard.tsx
```

- [ ] **Step 6: README 진행 현황 업데이트**

`README.md`의 "## 진행 현황" 섹션을 아래로 교체:
```markdown
## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [x] 3단계: Google Drive 연동
- [x] 4단계: Notion 연동
- [x] 5단계: 홈 화면 통합
```

- [ ] **Step 7: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 테스트 회귀 없음)

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 8: 커밋**

```bash
git add -A app/page.tsx app/page.test.tsx components/dashboard/ServiceSummaryCard.tsx README.md
git commit -m "feat: 홈 화면에 서비스별 실시간 요약 데이터 연결"
```
