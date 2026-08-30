# 개인 업무 대시보드 - Google Drive 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 대시보드 안에서 Google Drive 파일/폴더를 조회(폴더 탐색)하고, 업로드하고, 이름을 바꾸고, 삭제(휴지통 이동)할 수 있게 한다. 이 계획은 5단계 중 3단계이며, 1단계(기반 구축)와 2단계(Gmail 연동)가 이미 `master`에 병합되어 있다.

**Architecture:** 2단계에서 이미 Gmail과 Drive 스코프를 함께 요청해 저장해둔 Google refresh token을 그대로 재사용한다 — **새로운 OAuth 플로우는 필요 없다.** 스펙의 라이브 프록시 구조(A안)를 그대로 따라 로컬 캐시 없이 매번 Drive API를 직접 호출한다. Gmail 계획에서 최종 리뷰로 얻은 교훈(토큰 만료 시 재연결 안내, `force-dynamic`, Server Action의 `requireAdmin()` 방어, 404/기타 에러 구분 처리, 클라이언트 액션의 에러 상태 복구)을 이번엔 처음부터 반영한다.

**Tech Stack:** googleapis(Drive v3 API) — 기존 의존성 재사용 · Next.js Route Handlers/Server Actions · Node `stream.Readable`(업로드 스트림 변환)

**Spec:** [docs/superpowers/specs/2026-08-30-personal-ops-dashboard-design.md](../specs/2026-08-30-personal-ops-dashboard-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다.
- 라이브 프록시 구조 — Drive 데이터를 로컬에 캐시/미러링하지 않는다 (스펙 §6).
- Drive 스코프는 조회+업로드+관리(이름변경/삭제)를 모두 포함한다 (스펙 §7.1 — 이미 2단계에서 `https://www.googleapis.com/auth/drive` 전체 스코프로 동의 받음).
- 새로운 Google OAuth 플로우를 만들지 않는다 — `lib/google/tokenStore.ts`의 `getGoogleRefreshToken()`과 기존 `/api/auth/google/start` 라우트를 재사용한다 (재연결이 필요할 때도 동일 라우트로 링크).
- 라이브 데이터를 읽는 모든 페이지(Server Component)는 `export const dynamic = "force-dynamic"`을 명시한다 — 정적 생성 시 빌드 시점 스냅샷이 영구히 굳는 것을 방지한다 (2단계 최종 리뷰에서 발견된 교훈).
- Drive 데이터를 변경하는 모든 Server Action은 함수 본문 첫 줄에 `await requireAdmin()`을 호출한다 — 미들웨어가 이미 보호하지만 방어 심층화 원칙을 따른다 (2단계 최종 리뷰에서 합의된 패턴, `lib/auth/requireAdmin.ts`에 이미 존재).
- Google API 호출에서 404(대상 없음)와 그 외 에러(인증 만료 등)를 구분한다: 404는 `notFound()`로, 그 외는 "다시 연결해주세요" 안내로 처리한다.
- 클라이언트 컴포넌트에서 Server Action을 호출할 때는 항상 `try/catch`로 감싸 실패 시 한글 에러 메시지를 보여주고 로딩 상태를 원복한다 — 절대 버튼이 영구히 비활성 상태로 멈추지 않는다.

---

### Task 1: Drive API 래퍼

**Files:**
- Create: `lib/google/driveClient.ts`
- Test: `lib/google/driveClient.test.ts`

**Interfaces:**
- Consumes: `createGoogleOAuthClient` (2단계, `lib/google/oauthClient.ts`), `getGoogleRefreshToken` (2단계, `lib/google/tokenStore.ts`)
- Produces: `type DriveFileSummary = { id: string; name: string; isFolder: boolean; modifiedTime: string; size: string | null }`, `type DriveFolderView = { folderId: string; folderName: string; parentId: string | null; files: DriveFileSummary[] }`, `isGoogleConnected(): Promise<boolean>`, `listFolder(folderId?: string): Promise<DriveFolderView | null>`, `uploadFile(params: { folderId: string; fileName: string; mimeType: string; content: Buffer }): Promise<void>`, `renameFile(fileId: string, newName: string): Promise<void>`, `trashFile(fileId: string): Promise<void>` — 모두 `lib/google/driveClient.ts`. Task 2~4가 이 함수들을 사용한다.

**중요:** `isGoogleConnected`는 `lib/google/gmailClient.ts`에도 동일한 이름의 함수가 이미 있다(2단계). 두 함수는 로직이 3줄로 동일하지만, 이미 병합·리뷰가 끝난 2단계 파일을 이번 계획에서 건드리는 위험을 피하기 위해 **의도적으로 각자 독립적으로 둔다** — 공유 모듈로 리팩터링하지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/google/driveClient.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getGoogleRefreshTokenMock,
  setCredentialsMock,
  createGoogleOAuthClientMock,
  filesGetMock,
  filesListMock,
  filesCreateMock,
  filesUpdateMock,
} = vi.hoisted(() => {
  const setCredentialsMock = vi.fn();
  return {
    getGoogleRefreshTokenMock: vi.fn(),
    setCredentialsMock,
    createGoogleOAuthClientMock: vi.fn(() => ({ setCredentials: setCredentialsMock })),
    filesGetMock: vi.fn(),
    filesListMock: vi.fn(),
    filesCreateMock: vi.fn(),
    filesUpdateMock: vi.fn(),
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
    drive: vi.fn(() => ({
      files: {
        get: filesGetMock,
        list: filesListMock,
        create: filesCreateMock,
        update: filesUpdateMock,
      },
    })),
  },
}));

import { listFolder, uploadFile, renameFile, trashFile, isGoogleConnected } from "./driveClient";

describe("driveClient", () => {
  beforeEach(() => {
    getGoogleRefreshTokenMock.mockReset();
    setCredentialsMock.mockReset();
    createGoogleOAuthClientMock.mockClear();
    filesGetMock.mockReset();
    filesListMock.mockReset();
    filesCreateMock.mockReset();
    filesUpdateMock.mockReset();
  });

  it("Google 계정이 연결되어 있지 않으면 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await listFolder();

    expect(result).toBeNull();
    expect(filesListMock).not.toHaveBeenCalled();
  });

  it("잘못된 형식의 folderId는 API를 호출하지 않고 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");

    const result = await listFolder("../etc/passwd");

    expect(result).toBeNull();
    expect(filesListMock).not.toHaveBeenCalled();
  });

  it("루트 폴더의 파일/폴더 목록을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "folder-1",
            name: "문서함",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2026-08-01T00:00:00Z",
          },
          {
            id: "file-1",
            name: "메모.txt",
            mimeType: "text/plain",
            modifiedTime: "2026-08-02T00:00:00Z",
            size: "120",
          },
        ],
      },
    });

    const result = await listFolder();

    expect(setCredentialsMock).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(filesGetMock).not.toHaveBeenCalled();
    expect(filesListMock).toHaveBeenCalledWith({
      q: "'root' in parents and trashed = false",
      fields: "files(id, name, mimeType, modifiedTime, size)",
      orderBy: "folder,name",
    });
    expect(result).toEqual({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        {
          id: "folder-1",
          name: "문서함",
          isFolder: true,
          modifiedTime: "2026-08-01T00:00:00Z",
          size: null,
        },
        {
          id: "file-1",
          name: "메모.txt",
          isFolder: false,
          modifiedTime: "2026-08-02T00:00:00Z",
          size: "120",
        },
      ],
    });
  });

  it("하위 폴더 조회 시 폴더 이름과 상위 폴더 ID를 함께 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockResolvedValue({
      data: { id: "folder-1", name: "문서함", parents: ["root"] },
    });
    filesListMock.mockResolvedValue({ data: { files: [] } });

    const result = await listFolder("folder-1");

    expect(filesGetMock).toHaveBeenCalledWith({
      fileId: "folder-1",
      fields: "id, name, parents",
    });
    expect(result).toEqual({
      folderId: "folder-1",
      folderName: "문서함",
      parentId: "root",
      files: [],
    });
  });

  it("존재하지 않는 폴더 ID는 null을 반환한다 (404)", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockRejectedValue({ response: { status: 404 } });

    const result = await listFolder("missing-folder");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockRejectedValue({ response: { status: 401 } });

    await expect(listFolder("some-folder")).rejects.toBeTruthy();
  });

  it("Google 계정이 연결되어 있지 않으면 업로드 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(
      uploadFile({
        folderId: "root",
        fileName: "a.txt",
        mimeType: "text/plain",
        content: Buffer.from("hi"),
      })
    ).rejects.toThrow();
  });

  it("업로드는 지정한 폴더에 파일을 생성한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesCreateMock.mockResolvedValue({});

    await uploadFile({
      folderId: "root",
      fileName: "a.txt",
      mimeType: "text/plain",
      content: Buffer.from("hi"),
    });

    expect(filesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { name: "a.txt", parents: ["root"] },
        media: expect.objectContaining({ mimeType: "text/plain" }),
      })
    );
  });

  it("이름변경은 파일의 name 속성만 수정한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesUpdateMock.mockResolvedValue({});

    await renameFile("file-1", "새이름.txt");

    expect(filesUpdateMock).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: { name: "새이름.txt" },
    });
  });

  it("삭제는 trashed를 true로 설정한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesUpdateMock.mockResolvedValue({});

    await trashFile("file-1");

    expect(filesUpdateMock).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: { trashed: true },
    });
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

Run: `npx vitest run lib/google/driveClient.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

`lib/google/driveClient.ts`:
```ts
import { Readable } from "stream";
import { google, drive_v3 } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { getGoogleRefreshToken } from "@/lib/google/tokenStore";

export type DriveFileSummary = {
  id: string;
  name: string;
  isFolder: boolean;
  modifiedTime: string;
  size: string | null;
};

export type DriveFolderView = {
  folderId: string;
  folderName: string;
  parentId: string | null;
  files: DriveFileSummary[];
};

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const VALID_ID_PATTERN = /^[\w-]+$/;

async function getDriveClient(): Promise<drive_v3.Drive | null> {
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const auth = createGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth });
}

function extractErrorStatus(error: unknown): number {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    Number((error as { code?: number | string })?.code);
  return Number.isNaN(status) ? 0 : Number(status);
}

export async function isGoogleConnected(): Promise<boolean> {
  const refreshToken = await getGoogleRefreshToken();
  return refreshToken !== null;
}

export async function listFolder(folderId: string = "root"): Promise<DriveFolderView | null> {
  if (!VALID_ID_PATTERN.test(folderId)) {
    return null;
  }

  const drive = await getDriveClient();
  if (!drive) {
    return null;
  }

  try {
    let folderName = "내 드라이브";
    let parentId: string | null = null;

    if (folderId !== "root") {
      const folderMeta = await drive.files.get({
        fileId: folderId,
        fields: "id, name, parents",
      });
      folderName = folderMeta.data.name ?? "폴더";
      parentId = folderMeta.data.parents?.[0] ?? "root";
    }

    const listResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime, size)",
      orderBy: "folder,name",
    });

    const files: DriveFileSummary[] = (listResponse.data.files ?? []).map((file) => ({
      id: file.id!,
      name: file.name ?? "(이름 없음)",
      isFolder: file.mimeType === FOLDER_MIME_TYPE,
      modifiedTime: file.modifiedTime ?? "",
      size: file.size ?? null,
    }));

    return { folderId, folderName, parentId, files };
  } catch (error) {
    if (extractErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function uploadFile(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.content),
    },
  });
}

export async function renameFile(fileId: string, newName: string): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.update({
    fileId,
    requestBody: { name: newName },
  });
}

export async function trashFile(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/google/driveClient.test.ts`
Expected: PASS (11개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/google/driveClient.ts lib/google/driveClient.test.ts
git commit -m "feat: Drive API 래퍼(조회/업로드/이름변경/삭제) 추가"
```

---

### Task 2: Drive 폴더 조회 페이지 UI

**Files:**
- Modify: `app/drive/page.tsx`
- Create: `app/drive/page.test.tsx`
- Modify: `app/placeholder-pages.test.tsx`

**Interfaces:**
- Consumes: `isGoogleConnected`, `listFolder`, `type DriveFolderView` (Task 1)
- Produces: `/drive` 페이지가 실제 Drive 폴더를 보여주는 Server Component가 됨 (`?folderId=` 쿼리로 하위 폴더 탐색). Task 3, 4가 이 페이지에 업로드/이름변경/삭제 UI를 추가한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/drive/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import DrivePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { isGoogleConnectedMock, listFolderMock } = vi.hoisted(() => ({
  isGoogleConnectedMock: vi.fn(),
  listFolderMock: vi.fn(),
}));

vi.mock("@/lib/google/driveClient", () => ({
  isGoogleConnected: isGoogleConnectedMock,
  listFolder: listFolderMock,
}));

async function renderDrivePage(searchParams: { folderId?: string } = {}) {
  const element = await DrivePage({ searchParams });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("DrivePage", () => {
  beforeEach(() => {
    isGoogleConnectedMock.mockReset();
    listFolderMock.mockReset();
  });

  it("연결되지 않은 경우 Google 계정 연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(false);

    await renderDrivePage();

    expect(
      screen.getByText("Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google 계정 연결" })).toHaveAttribute(
      "href",
      "/api/auth/google/start"
    );
    expect(listFolderMock).not.toHaveBeenCalled();
  });

  it("연결된 경우 폴더 목록을 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "folder-1", name: "문서함", isFolder: true, modifiedTime: "", size: null },
        { id: "file-1", name: "메모.txt", isFolder: false, modifiedTime: "", size: "120" },
      ],
    });

    await renderDrivePage();

    expect(listFolderMock).toHaveBeenCalledWith("root");
    expect(screen.getByText("내 드라이브")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /문서함/ })).toHaveAttribute(
      "href",
      "/drive?folderId=folder-1"
    );
    expect(screen.getByText("메모.txt")).toBeInTheDocument();
  });

  it("상위 폴더가 있으면 상위 폴더 링크를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "folder-1",
      folderName: "문서함",
      parentId: "root",
      files: [],
    });

    await renderDrivePage({ folderId: "folder-1" });

    expect(listFolderMock).toHaveBeenCalledWith("folder-1");
    expect(screen.getByRole("link", { name: "← 상위 폴더" })).toHaveAttribute(
      "href",
      "/drive?folderId=root"
    );
  });

  it("폴더가 비어 있으면 안내 문구를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [],
    });

    await renderDrivePage();

    expect(screen.getByText("폴더가 비어 있습니다.")).toBeInTheDocument();
  });

  it("조회가 실패하면 재연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockRejectedValue(new Error("token expired"));

    await renderDrivePage();

    expect(
      screen.getByText("Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });
});
```

(`listFolder`가 `null`을 반환해 `notFound()`가 호출되는 경로는 Next.js의 특수 예외를 던지는 동작이라 이 파일에서 단위 테스트하지 않는다 — 2단계 Gmail 상세 페이지와 동일한 이유로, 전체 테스트 스위트와 빌드 통과로 회귀만 확인한다.)

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/drive/page.test.tsx`
Expected: FAIL — 현재 `app/drive/page.tsx`는 플레이스홀더 문구만 보여줌.

- [ ] **Step 3: `app/drive/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { isGoogleConnected, listFolder } from "@/lib/google/driveClient";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: { folderId?: string };
}) {
  const connected = await isGoogleConnected();

  if (!connected) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <h1 className="mt-4 text-lg font-semibold text-neutral-50">Google Drive</h1>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 연결
            </a>
          </div>
        </div>
      </main>
    );
  }

  const folderId = searchParams.folderId ?? "root";

  let view;
  try {
    view = await listFolder(folderId);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 다시 연결
            </a>
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
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.folderName}</h1>
        {view.parentId ? (
          <Link
            href={`/drive?folderId=${view.parentId}`}
            className="mt-1 inline-block text-sm text-neutral-400 hover:text-neutral-200"
          >
            ← 상위 폴더
          </Link>
        ) : null}

        {view.files.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">폴더가 비어 있습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                {file.isFolder ? (
                  <Link
                    href={`/drive?folderId=${file.id}`}
                    className="text-sm font-medium text-neutral-50 hover:underline"
                  >
                    {file.name}
                    <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                      폴더
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-neutral-50">{file.name}</p>
                )}
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

Run: `npx vitest run app/drive/page.test.tsx`
Expected: PASS (5개 테스트 모두 통과)

- [ ] **Step 5: `app/placeholder-pages.test.tsx`에서 Drive 관련 부분 제거**

`app/placeholder-pages.test.tsx` 전체를 아래로 교체 (Notion만 남기고, Drive는 Step 1에서 만든 전용 테스트 파일로 대체됨):
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import NotionPage from "./notion/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: vi.fn() },
  }),
}));

function renderPage(page: React.ReactElement) {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {page}
    </ThemeProvider>
  );
}

describe("서비스별 빈 라우트", () => {
  it("Notion 페이지는 한글 안내 문구와 홈으로 돌아가는 링크를 보여준다", () => {
    renderPage(<NotionPage />);
    expect(screen.getByText("Notion 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 6: 전체 테스트로 통합 검증**

Run: `npm test`
Expected: 모든 테스트 PASS (기존 테스트 회귀 없음)

- [ ] **Step 7: 커밋**

```bash
git add app/drive/page.tsx app/drive/page.test.tsx app/placeholder-pages.test.tsx
git commit -m "feat: Drive 폴더 조회 페이지를 실제 데이터로 연결"
```

---

### Task 3: 파일 업로드 기능

**Files:**
- Create: `app/drive/actions.ts`
- Create: `app/drive/UploadForm.tsx`
- Test: `app/drive/UploadForm.test.tsx`
- Modify: `app/drive/page.tsx`
- Modify: `app/drive/page.test.tsx`

**Interfaces:**
- Consumes: `uploadFile` (Task 1), `requireAdmin` (2단계, `lib/auth/requireAdmin.ts`)
- Produces: `uploadFileAction(formData: FormData): Promise<void>` (`app/drive/actions.ts`), `UploadForm` 컴포넌트(props `{ folderId: string }`, `app/drive/UploadForm.tsx`). Task 4가 `app/drive/actions.ts`에 함수를 추가한다.

- [ ] **Step 1: 업로드 Server Action 작성**

`app/drive/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { uploadFile } from "@/lib/google/driveClient";

export async function uploadFileAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const file = formData.get("file");
  const folderId = formData.get("folderId");

  if (!(file instanceof File) || typeof folderId !== "string") {
    throw new Error("업로드할 파일이 없습니다.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const content = Buffer.from(arrayBuffer);

  await uploadFile({
    folderId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    content,
  });

  revalidatePath("/drive");
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — 업로드 폼**

`app/drive/UploadForm.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadForm } from "./UploadForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { uploadFileActionMock } = vi.hoisted(() => ({
  uploadFileActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  uploadFileAction: uploadFileActionMock,
}));

function makeFile(name: string, content: string, type: string) {
  return new File([content], name, { type });
}

describe("UploadForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    uploadFileActionMock.mockReset();
  });

  it("파일을 선택하고 제출하면 업로드 액션을 호출한다", async () => {
    uploadFileActionMock.mockResolvedValue(undefined);

    render(<UploadForm folderId="root" />);

    const input = screen.getByLabelText("업로드할 파일") as HTMLInputElement;
    const file = makeFile("test.txt", "hello", "text/plain");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(uploadFileActionMock).toHaveBeenCalledTimes(1));
    const formData = uploadFileActionMock.mock.calls[0][0] as FormData;
    expect(formData.get("folderId")).toBe("root");
    expect((formData.get("file") as File).name).toBe("test.txt");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("업로드에 실패하면 한글 에러 메시지를 보여준다", async () => {
    uploadFileActionMock.mockRejectedValue(new Error("upload failed"));

    render(<UploadForm folderId="root" />);

    const input = screen.getByLabelText("업로드할 파일") as HTMLInputElement;
    const file = makeFile("test.txt", "hello", "text/plain");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "업로드에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
    expect(screen.getByRole("button", { name: "업로드" })).not.toBeDisabled();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/drive/UploadForm.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 업로드 폼 구현**

`app/drive/UploadForm.tsx`:
```tsx
"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileAction } from "./actions";

export function UploadForm({ folderId }: { folderId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folderId", folderId);

    try {
      await uploadFileAction(formData);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      router.refresh();
    } catch {
      setErrorMessage("업로드에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        required
        className="text-sm text-neutral-300"
        aria-label="업로드할 파일"
      />
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isUploading ? "업로드 중..." : "업로드"}
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

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/drive/UploadForm.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 6: `app/drive/page.tsx`에 업로드 폼 연결**

`app/drive/page.tsx` 전체를 아래로 교체 (Task 2와 비교해 `UploadForm` import와 상위 폴더 링크 다음의 `<UploadForm />` 한 줄만 추가됨, 나머지는 동일):
```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { isGoogleConnected, listFolder } from "@/lib/google/driveClient";
import { UploadForm } from "./UploadForm";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: { folderId?: string };
}) {
  const connected = await isGoogleConnected();

  if (!connected) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <h1 className="mt-4 text-lg font-semibold text-neutral-50">Google Drive</h1>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 연결
            </a>
          </div>
        </div>
      </main>
    );
  }

  const folderId = searchParams.folderId ?? "root";

  let view;
  try {
    view = await listFolder(folderId);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 다시 연결
            </a>
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
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.folderName}</h1>
        {view.parentId ? (
          <Link
            href={`/drive?folderId=${view.parentId}`}
            className="mt-1 inline-block text-sm text-neutral-400 hover:text-neutral-200"
          >
            ← 상위 폴더
          </Link>
        ) : null}

        <UploadForm folderId={view.folderId} />

        {view.files.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">폴더가 비어 있습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                {file.isFolder ? (
                  <Link
                    href={`/drive?folderId=${file.id}`}
                    className="text-sm font-medium text-neutral-50 hover:underline"
                  >
                    {file.name}
                    <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                      폴더
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-neutral-50">{file.name}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 7: `app/drive/page.test.tsx`의 "연결된 경우 폴더 목록을 보여준다" 테스트에 업로드 폼 확인 추가**

해당 테스트의 마지막 `expect` 줄(`expect(screen.getByText("메모.txt")).toBeInTheDocument();`) 바로 다음 줄에 추가:
```tsx
    expect(screen.getByLabelText("업로드할 파일")).toBeInTheDocument();
```

- [ ] **Step 8: 전체 테스트 및 빌드로 통합 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add app/drive/actions.ts app/drive/UploadForm.tsx app/drive/UploadForm.test.tsx app/drive/page.tsx app/drive/page.test.tsx
git commit -m "feat: Drive 파일 업로드 기능 추가"
```

---

### Task 4: 이름변경 + 삭제 기능

**Files:**
- Modify: `app/drive/actions.ts`
- Create: `app/drive/FileRowActions.tsx`
- Test: `app/drive/FileRowActions.test.tsx`
- Modify: `app/drive/page.tsx`
- Modify: `app/drive/page.test.tsx`

**Interfaces:**
- Consumes: `renameFile`, `trashFile` (Task 1), `requireAdmin` (2단계)
- Produces: `renameFileAction(fileId: string, newName: string): Promise<void>`, `trashFileAction(fileId: string): Promise<void>` (`app/drive/actions.ts`에 추가), `FileRowActions` 컴포넌트(props `{ fileId: string; currentName: string }`, `app/drive/FileRowActions.tsx`). Drive 연동 기능이 이 계획 안에서 완결된다 (4단계는 Notion에만 집중).

- [ ] **Step 1: `app/drive/actions.ts`에 이름변경/삭제 액션 추가**

`app/drive/actions.ts` 파일 맨 위 import 목록을 아래로 교체:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { uploadFile, renameFile, trashFile } from "@/lib/google/driveClient";
```

그리고 기존 `uploadFileAction` 함수 뒤에 아래 두 함수를 추가:
```ts

export async function renameFileAction(fileId: string, newName: string): Promise<void> {
  await requireAdmin();

  if (!newName.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await renameFile(fileId, newName.trim());
  revalidatePath("/drive");
}

export async function trashFileAction(fileId: string): Promise<void> {
  await requireAdmin();
  await trashFile(fileId);
  revalidatePath("/drive");
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — 이름변경/삭제 UI**

`app/drive/FileRowActions.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { FileRowActions } from "./FileRowActions";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameFileActionMock, trashFileActionMock } = vi.hoisted(() => ({
  renameFileActionMock: vi.fn(),
  trashFileActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameFileAction: renameFileActionMock,
  trashFileAction: trashFileActionMock,
}));

describe("FileRowActions", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameFileActionMock.mockReset();
    trashFileActionMock.mockReset();
  });

  it("이름변경 버튼을 누르면 입력창이 나타나고 저장하면 액션을 호출한다", async () => {
    renameFileActionMock.mockResolvedValue(undefined);

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));

    const input = screen.getByLabelText("새 이름") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "새이름.txt" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameFileActionMock).toHaveBeenCalledWith("file-1", "새이름.txt")
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("이름 변경에 실패하면 한글 에러 메시지를 보여준다", async () => {
    renameFileActionMock.mockRejectedValue(new Error("rename failed"));

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "이름변경" }));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이름 변경에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  });

  it("삭제 버튼을 누르면 삭제 액션을 호출한다", async () => {
    trashFileActionMock.mockResolvedValue(undefined);

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(trashFileActionMock).toHaveBeenCalledWith("file-1"));
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제에 실패하면 한글 에러 메시지를 보여주고 버튼을 다시 활성화한다", async () => {
    trashFileActionMock.mockRejectedValue(new Error("delete failed"));

    render(<FileRowActions fileId="file-1" currentName="원본이름.txt" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "삭제에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
    expect(screen.getByRole("button", { name: "삭제" })).not.toBeDisabled();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/drive/FileRowActions.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 이름변경/삭제 UI 구현**

`app/drive/FileRowActions.tsx`:
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFileAction, trashFileAction } from "./actions";

export function FileRowActions({ fileId, currentName }: { fileId: string; currentName: string }) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSaveRename() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameFileAction(fileId, newName);
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashFileAction(fileId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
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
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-50"
          />
          <button
            type="button"
            onClick={handleSaveRename}
            disabled={isSaving}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
        >
          이름변경
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
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
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/drive/FileRowActions.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 6: `app/drive/page.tsx`에 이름변경/삭제 UI 연결**

`app/drive/page.tsx`에서 `import` 목록에 `import { FileRowActions } from "./FileRowActions";`을 추가하고, 파일 목록을 렌더링하는 `<ul>` 블록 전체를 아래로 교체:
```tsx
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                {file.isFolder ? (
                  <Link
                    href={`/drive?folderId=${file.id}`}
                    className="text-sm font-medium text-neutral-50 hover:underline"
                  >
                    {file.name}
                    <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                      폴더
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-neutral-50">{file.name}</p>
                )}
                <FileRowActions fileId={file.id} currentName={file.name} />
              </li>
            ))}
          </ul>
```

(왼쪽 폴더/파일 표시 부분은 Task 2와 동일하게 유지되고, 오른쪽에 `FileRowActions`만 추가된다 — 기존 `app/drive/page.test.tsx`의 폴더/파일 관련 단언은 그대로 통과해야 한다.)

- [ ] **Step 7: `app/drive/page.test.tsx`의 "연결된 경우 폴더 목록을 보여준다" 테스트에 액션 버튼 확인 추가**

Task 3의 Step 7에서 추가한 `expect(screen.getByLabelText("업로드할 파일")).toBeInTheDocument();` 줄 바로 다음에 추가:
```tsx
    expect(screen.getAllByRole("button", { name: "이름변경" })).toHaveLength(2);
```

- [ ] **Step 8: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add app/drive/actions.ts app/drive/FileRowActions.tsx app/drive/FileRowActions.test.tsx app/drive/page.tsx app/drive/page.test.tsx
git commit -m "feat: Drive 파일 이름변경/삭제 기능 추가"
```

---

### Task 5: 홈 카드 문구 업데이트 + 진행 현황

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음 (문구 변경만)
- Produces: 없음 (이 계획의 마지막 태스크)

- [ ] **Step 1: `app/page.tsx`의 Drive 카드 문구 업데이트**

`app/page.tsx` 전체를 아래로 교체 (Drive 카드의 `description`만 변경, 나머지는 동일):
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
        <ServiceSummaryCard title="Notion" description="Notion 연동 준비 중입니다." href="/notion" />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `app/page.test.tsx` 업데이트**

`app/page.test.tsx` 전체를 아래로 교체 (첫 번째 테스트의 Drive 문구만 변경, 나머지는 동일):
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
    expect(screen.getByText("Notion 연동 준비 중입니다.")).toBeInTheDocument();
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
- [ ] 4단계: Notion 연동
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
git commit -m "feat: 홈 화면 Drive 카드 문구 업데이트 및 진행 현황 갱신"
```
