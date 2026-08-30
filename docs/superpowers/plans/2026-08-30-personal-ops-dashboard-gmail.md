# 개인 업무 대시보드 - Gmail 연동 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 개인 관리자 계정으로 Google 계정을 연결(OAuth)하고, Gmail 최근 메일 목록 조회/상세 보기/삭제(휴지통)/새 메일 발송까지 되는 완전한 Gmail 클라이언트를 대시보드 안에 구현한다. 이 계획은 5단계 중 2단계이며, 1단계(기반 구축: 인증/미들웨어/다크모드/빈 라우트)가 이미 `master`에 병합되어 있다.

**Architecture:** 스펙의 라이브 프록시 구조(A안)를 따른다 — 로컬 캐시 없이 Gmail API를 매 요청마다 직접 호출한다. Google OAuth는 Gmail과 Drive 스코프를 한 번에 요청하는 단일 동의 화면으로 구현해(스펙 §7.1), 3단계(Drive 연동)에서 별도 OAuth 플로우 없이 동일한 refresh token을 재사용할 수 있게 한다. Refresh token은 서버 측 AES-256-GCM으로 암호화해 Supabase `oauth_tokens` 테이블(서비스 롤 키로만 접근)에 저장한다. 1단계에서 만든 `requireAdmin()` 헬퍼를 모든 신규 Route Handler에 적용해 방어적 이중 검증을 한다.

**Tech Stack:** googleapis(Node.js 공식 Google API 클라이언트) · Node `crypto`(AES-256-GCM) · @supabase/supabase-js(서비스 롤 클라이언트) · Next.js Route Handlers + Server Actions

**Spec:** [docs/superpowers/specs/2026-08-30-personal-ops-dashboard-design.md](../specs/2026-08-30-personal-ops-dashboard-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트(라벨, 버튼, 안내 문구, 에러 메시지)는 한글로 작성한다.
- Gmail 스코프는 읽기+발송+삭제(trash) 전부를 요청한다 (`gmail.modify`, `gmail.send`) (스펙 §7.1).
- Google OAuth 동의 화면은 "테스트" 모드로 유지하고, Gmail과 Drive 스코프를 하나의 동의 요청에 함께 포함시킨다 (스펙 §7.1 — Drive는 3단계에서 사용하지만 스코프는 지금 함께 받는다).
- Refresh token은 평문으로 저장하지 않는다 — 서버 측 대칭키(AES-256-GCM)로 암호화 후 저장한다 (스펙 §8).
- 이메일 본문은 절대 `dangerouslySetInnerHTML`로 렌더링하지 않는다 — text/plain만 추출해서 일반 텍스트로 표시한다 (XSS 방지, 이번 계획에서 새로 정한 제약).
- 신규 Route Handler는 미들웨어의 기본 보호에 더해 `requireAdmin()`으로 한 번 더 검증한다 (1단계 최종 리뷰에서 합의된 방어 심층화 패턴).
- 라이브 프록시 구조를 따른다 — Gmail 데이터를 Supabase 등 로컬에 미러링하지 않는다 (스펙 §6).

---

### Task 1: 토큰 암호화 유틸 + Supabase 스키마 + 환경변수/문서

**Files:**
- Create: `lib/crypto/tokenCipher.ts`
- Test: `lib/crypto/tokenCipher.test.ts`
- Create: `supabase/migrations/0001_oauth_tokens.sql`
- Modify: `.env.local.example`
- Modify: `README.md`

**Interfaces:**
- Produces: `encryptToken(plainText: string): string`, `decryptToken(cipherText: string): string` — `lib/crypto/tokenCipher.ts`. Task 2의 `tokenStore.ts`가 이 두 함수를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/crypto/tokenCipher.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken } from "./tokenCipher";

describe("tokenCipher", () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it("암호화한 값을 복호화하면 원래 문자열로 돌아온다", () => {
    const original = "test-refresh-token-value";
    const encrypted = encryptToken(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("같은 값을 두 번 암호화하면 서로 다른 암호문이 나온다 (매번 다른 IV)", () => {
    const a = encryptToken("same-value");
    const b = encryptToken("same-value");
    expect(a).not.toBe(b);
  });

  it("암호문이 변조되면 복호화 시 에러를 던진다", () => {
    const encrypted = encryptToken("tamper-test");
    const [iv, authTag, data] = encrypted.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "00"].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("TOKEN_ENCRYPTION_KEY가 없으면 에러를 던진다", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("value")).toThrow();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run lib/crypto/tokenCipher.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

`lib/crypto/tokenCipher.ts`:
```ts
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const keyHex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error("TOKEN_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.");
  }
  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY는 32바이트(64자리 hex)여야 합니다.");
  }
  return key;
}

export function encryptToken(plainText: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptToken(cipherText: string): string {
  const key = getKey();
  const [ivHex, authTagHex, encryptedHex] = cipherText.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("암호화된 토큰 형식이 올바르지 않습니다.");
  }
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/crypto/tokenCipher.test.ts`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: Supabase 스키마 작성**

`supabase/migrations/0001_oauth_tokens.sql`:
```sql
create table if not exists oauth_tokens (
  provider text primary key,
  encrypted_refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table oauth_tokens enable row level security;

-- 이 테이블은 서버(서비스 역할 키)에서만 접근합니다.
-- anon/authenticated 역할에는 정책을 부여하지 않아 기본적으로 모든 접근이 차단됩니다.
```

- [ ] **Step 6: 환경변수 예시 추가**

`.env.local.example`에 아래 4줄을 추가 (기존 내용 유지):
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
TOKEN_ENCRYPTION_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 7: README에 Google 연동 설정 섹션 추가**

`README.md`의 "## Supabase 설정" 섹션 뒤에 아래 섹션을 추가:
```markdown
## Google 연동 설정 (Gmail/Drive)

1. https://console.cloud.google.com 에서 새 프로젝트 생성
2. "API 및 서비스 > OAuth 동의 화면"에서 User Type을 "외부"로 선택하고,
   게시 상태를 반드시 **"테스트"**로 유지 (심사 불필요). "테스트 사용자"에
   본인 Google 계정 이메일을 추가
3. "API 및 서비스 > 라이브러리"에서 Gmail API와 Google Drive API를 각각 사용 설정
4. "API 및 서비스 > 사용자 인증 정보"에서 OAuth 클라이언트 ID 생성
   (애플리케이션 유형: 웹 애플리케이션). "승인된 리디렉션 URI"에
   `http://localhost:3000/api/auth/google/callback` (로컬 개발용)과
   배포 후에는 `https://<Vercel 도메인>/api/auth/google/callback`을 등록
5. 발급받은 클라이언트 ID/보안 비밀번호를 `.env.local`의
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`에 입력하고,
   `GOOGLE_REDIRECT_URI`에는 4번에서 등록한 콜백 URL을 그대로 입력
6. 토큰 암호화 키 생성: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   실행 결과를 `.env.local`의 `TOKEN_ENCRYPTION_KEY`에 입력
   (64자리 16진수 문자열이어야 함)
7. Supabase 프로젝트 설정 > API 메뉴에서 `service_role` 키를 복사해
   `.env.local`의 `SUPABASE_SERVICE_ROLE_KEY`에 입력 (이 키는 절대
   `NEXT_PUBLIC_` 접두사를 붙이지 말 것 — 브라우저에 노출되면 안 됨)
8. Supabase 대시보드의 SQL Editor에서 `supabase/migrations/0001_oauth_tokens.sql`
   내용을 실행해 `oauth_tokens` 테이블 생성
```

`README.md`의 "## GitHub / Vercel 연결" 섹션 3번 항목(Vercel Environment Variables 등록 목록)을 아래로 교체해 새 환경변수를 포함시킨다:
```markdown
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REDIRECT_URI`, `TOKEN_ENCRYPTION_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
   `GOOGLE_REDIRECT_URI`는 실제 배포 도메인의 콜백 URL로 설정할 것
   (`https://<Vercel 도메인>/api/auth/google/callback`)
```

- [ ] **Step 8: 커밋**

```bash
git add lib/crypto/tokenCipher.ts lib/crypto/tokenCipher.test.ts supabase/migrations/0001_oauth_tokens.sql .env.local.example README.md
git commit -m "feat: 토큰 암호화 유틸과 Google 연동용 Supabase 스키마 추가"
```

---

### Task 2: 서비스 롤 Supabase 클라이언트 + 토큰 저장소

**Files:**
- Create: `lib/supabase/serviceClient.ts`
- Create: `lib/google/tokenStore.ts`
- Test: `lib/google/tokenStore.test.ts`

**Interfaces:**
- Consumes: `encryptToken`, `decryptToken` (Task 1, `lib/crypto/tokenCipher.ts`)
- Produces: `createSupabaseServiceClient()` — `lib/supabase/serviceClient.ts`. `saveGoogleRefreshToken(refreshToken: string): Promise<void>`, `getGoogleRefreshToken(): Promise<string | null>` — `lib/google/tokenStore.ts`. Task 4(`gmailClient.ts`)가 `getGoogleRefreshToken`을, Task 3(콜백 라우트)이 `saveGoogleRefreshToken`을 사용한다.

- [ ] **Step 1: 서비스 롤 클라이언트 작성**

`lib/supabase/serviceClient.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/google/tokenStore.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveGoogleRefreshToken, getGoogleRefreshToken } from "./tokenStore";

const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ upsert: upsertMock, select: selectMock }));

vi.mock("@/lib/supabase/serviceClient", () => ({
  createSupabaseServiceClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/crypto/tokenCipher", () => ({
  encryptToken: (value: string) => `encrypted:${value}`,
  decryptToken: (value: string) => value.replace("encrypted:", ""),
}));

describe("tokenStore", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    maybeSingleMock.mockReset();
    eqMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
  });

  it("saveGoogleRefreshToken은 암호화한 값을 oauth_tokens 테이블에 upsert한다", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await saveGoogleRefreshToken("raw-refresh-token");

    expect(fromMock).toHaveBeenCalledWith("oauth_tokens");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        encrypted_refresh_token: "encrypted:raw-refresh-token",
      })
    );
  });

  it("upsert가 실패하면 에러를 던진다", async () => {
    upsertMock.mockResolvedValue({ error: { message: "db down" } });

    await expect(saveGoogleRefreshToken("raw-refresh-token")).rejects.toThrow("db down");
  });

  it("getGoogleRefreshToken은 저장된 토큰을 복호화해서 반환한다", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { encrypted_refresh_token: "encrypted:raw-refresh-token" },
      error: null,
    });

    const result = await getGoogleRefreshToken();

    expect(eqMock).toHaveBeenCalledWith("provider", "google");
    expect(result).toBe("raw-refresh-token");
  });

  it("저장된 토큰이 없으면 null을 반환한다", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await getGoogleRefreshToken();

    expect(result).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/google/tokenStore.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`lib/google/tokenStore.ts`:
```ts
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { encryptToken, decryptToken } from "@/lib/crypto/tokenCipher";

const PROVIDER = "google";

export async function saveGoogleRefreshToken(refreshToken: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const encrypted = encryptToken(refreshToken);

  const { error } = await supabase.from("oauth_tokens").upsert({
    provider: PROVIDER,
    encrypted_refresh_token: encrypted,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Google refresh token 저장 실패: ${error.message}`);
  }
}

export async function getGoogleRefreshToken(): Promise<string | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("encrypted_refresh_token")
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) {
    throw new Error(`Google refresh token 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return decryptToken(data.encrypted_refresh_token);
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/google/tokenStore.test.ts`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 6: 커밋**

```bash
git add lib/supabase/serviceClient.ts lib/google/tokenStore.ts lib/google/tokenStore.test.ts
git commit -m "feat: 서비스 롤 Supabase 클라이언트와 Google 토큰 저장소 추가"
```

---

### Task 3: Google OAuth 클라이언트 + 시작/콜백 라우트

**Files:**
- Create: `lib/google/oauthClient.ts`
- Test: `lib/google/oauthClient.test.ts`
- Create: `app/api/auth/google/start/route.ts`
- Test: `app/api/auth/google/start/route.test.ts`
- Create: `app/api/auth/google/callback/route.ts`
- Test: `app/api/auth/google/callback/route.test.ts`

**Interfaces:**
- Consumes: `requireAdmin`, `UnauthorizedError` (1단계, `lib/auth/requireAdmin.ts`), `saveGoogleRefreshToken` (Task 2)
- Produces: `GOOGLE_SCOPES: string[]`, `createGoogleOAuthClient(): OAuth2Client`, `getGoogleAuthUrl(): string` — `lib/google/oauthClient.ts`. Task 4(`gmailClient.ts`)가 `createGoogleOAuthClient`를 사용한다.

- [ ] **Step 1: googleapis 설치**

Run: `npm install googleapis`
Expected: `package.json`/`package-lock.json`에 `googleapis`가 추가됨. 정확한 버전은 npm이 설치 시점의 최신 안정 버전으로 결정하도록 둔다(하드코딩하지 않음).

- [ ] **Step 2: 실패하는 테스트 작성 — 인증 URL 생성**

`lib/google/oauthClient.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getGoogleAuthUrl, GOOGLE_SCOPES } from "./oauthClient";

describe("getGoogleAuthUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("Gmail과 Drive 스코프를 모두 포함한 인증 URL을 생성한다", () => {
    const url = getGoogleAuthUrl();
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const scopeParam = parsed.searchParams.get("scope") ?? "";
    for (const scope of GOOGLE_SCOPES) {
      expect(scopeParam).toContain(scope);
    }
  });

  it("access_type=offline과 prompt=consent를 요청해 refresh token을 받도록 한다", () => {
    const url = getGoogleAuthUrl();
    const parsed = new URL(url);

    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/google/oauthClient.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`lib/google/oauthClient.ts`:
```ts
import { google } from "googleapis";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/drive",
];

export function createGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(): string {
  const client = createGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/google/oauthClient.test.ts`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 6: 실패하는 테스트 작성 — 시작 라우트**

`app/api/auth/google/start/route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { UnauthorizedError } from "@/lib/auth/requireAdmin";

const requireAdminMock = vi.fn();
const getGoogleAuthUrlMock = vi.fn();

vi.mock("@/lib/auth/requireAdmin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/requireAdmin")>(
    "@/lib/auth/requireAdmin"
  );
  return { ...actual, requireAdmin: requireAdminMock };
});

vi.mock("@/lib/google/oauthClient", () => ({
  getGoogleAuthUrl: getGoogleAuthUrlMock,
}));

describe("GET /api/auth/google/start", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getGoogleAuthUrlMock.mockReset();
  });

  it("관리자가 아니면 401을 반환한다", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("관리자면 Google 인증 URL로 리다이렉트한다", async () => {
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
    getGoogleAuthUrlMock.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=1");

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?mock=1"
    );
  });
});
```

- [ ] **Step 7: 테스트 실패 확인**

Run: `npx vitest run app/api/auth/google/start/route.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 8: 최소 구현 작성**

`app/api/auth/google/start/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/requireAdmin";
import { getGoogleAuthUrl } from "@/lib/google/oauthClient";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 401 });
    }
    throw error;
  }

  return NextResponse.redirect(getGoogleAuthUrl());
}
```

- [ ] **Step 9: 테스트 통과 확인**

Run: `npx vitest run app/api/auth/google/start/route.test.ts`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 10: 실패하는 테스트 작성 — 콜백 라우트**

`app/api/auth/google/callback/route.test.ts`:
```ts
// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { UnauthorizedError } from "@/lib/auth/requireAdmin";

const requireAdminMock = vi.fn();
const createGoogleOAuthClientMock = vi.fn();
const saveGoogleRefreshTokenMock = vi.fn();

vi.mock("@/lib/auth/requireAdmin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/requireAdmin")>(
    "@/lib/auth/requireAdmin"
  );
  return { ...actual, requireAdmin: requireAdminMock };
});

vi.mock("@/lib/google/oauthClient", () => ({
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("@/lib/google/tokenStore", () => ({
  saveGoogleRefreshToken: saveGoogleRefreshTokenMock,
}));

function makeRequest(url: string) {
  return new NextRequest(new URL(url));
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createGoogleOAuthClientMock.mockReset();
    saveGoogleRefreshTokenMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("code 파라미터가 없으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/auth/google/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=missing_code");
  });

  it("refresh_token이 없으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockResolvedValue({ tokens: { access_token: "abc" } }),
    });

    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?code=test-code")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/gmail?error=no_refresh_token"
    );
    expect(saveGoogleRefreshTokenMock).not.toHaveBeenCalled();
  });

  it("정상 흐름에서는 refresh token을 저장하고 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockResolvedValue({ tokens: { refresh_token: "refresh-abc" } }),
    });
    saveGoogleRefreshTokenMock.mockResolvedValue(undefined);

    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?code=test-code")
    );

    expect(saveGoogleRefreshTokenMock).toHaveBeenCalledWith("refresh-abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?connected=1");
  });

  it("관리자가 아니면 401을 반환한다", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?code=test-code")
    );

    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 11: 테스트 실패 확인**

Run: `npx vitest run app/api/auth/google/callback/route.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 12: 최소 구현 작성**

`app/api/auth/google/callback/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/requireAdmin";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { saveGoogleRefreshToken } from "@/lib/google/tokenStore";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 401 });
    }
    throw error;
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/gmail?error=missing_code", request.url));
  }

  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/gmail?error=no_refresh_token", request.url));
  }

  await saveGoogleRefreshToken(tokens.refresh_token);

  return NextResponse.redirect(new URL("/gmail?connected=1", request.url));
}
```

- [ ] **Step 13: 테스트 통과 확인**

Run: `npx vitest run app/api/auth/google/callback/route.test.ts`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 14: 빌드로 통합 검증**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공.

- [ ] **Step 15: 커밋**

```bash
git add package.json package-lock.json lib/google/oauthClient.ts lib/google/oauthClient.test.ts app/api/auth/google/start/route.ts app/api/auth/google/start/route.test.ts app/api/auth/google/callback/route.ts app/api/auth/google/callback/route.test.ts
git commit -m "feat: Google OAuth 시작/콜백 라우트 추가"
```

---

### Task 4: Gmail API 래퍼

**Files:**
- Create: `lib/google/gmailClient.ts`
- Test: `lib/google/gmailClient.test.ts`

**Interfaces:**
- Consumes: `createGoogleOAuthClient` (Task 3), `getGoogleRefreshToken` (Task 2)
- Produces: `type GmailMessageSummary = { id: string; subject: string; from: string; date: string; snippet: string }`, `type GmailMessageDetail = GmailMessageSummary & { body: string }`, `listRecentMessages(maxResults?: number): Promise<GmailMessageSummary[]>`, `getMessageDetail(id: string): Promise<GmailMessageDetail | null>`, `sendEmail(params: { to: string; subject: string; body: string }): Promise<void>`, `trashMessage(id: string): Promise<void>`, `isGoogleConnected(): Promise<boolean>` — 모두 `lib/google/gmailClient.ts`. Task 5, 6이 이 함수들을 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/google/gmailClient.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const getGoogleRefreshTokenMock = vi.fn();
const setCredentialsMock = vi.fn();
const createGoogleOAuthClientMock = vi.fn(() => ({ setCredentials: setCredentialsMock }));

const messagesListMock = vi.fn();
const messagesGetMock = vi.fn();
const messagesSendMock = vi.fn();
const messagesTrashMock = vi.fn();

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
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현 작성**

`lib/google/gmailClient.ts`:
```ts
import { google, gmail_v1 } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { getGoogleRefreshToken } from "@/lib/google/tokenStore";

export type GmailMessageSummary = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailMessageDetail = GmailMessageSummary & {
  body: string;
};

async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const auth = createGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  return google.gmail({ version: "v1", auth });
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

function extractPlainTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) {
        return text;
      }
    }
  }

  return "";
}

export async function listRecentMessages(maxResults = 20): Promise<GmailMessageSummary[]> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return [];
  }

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
  });

  const messageIds = listResponse.data.messages ?? [];

  const messages = await Promise.all(
    messageIds.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      return {
        id: detail.data.id!,
        subject: getHeader(detail.data.payload?.headers, "Subject") || "(제목 없음)",
        from: getHeader(detail.data.payload?.headers, "From"),
        date: getHeader(detail.data.payload?.headers, "Date"),
        snippet: detail.data.snippet ?? "",
      };
    })
  );

  return messages;
}

export async function getMessageDetail(id: string): Promise<GmailMessageDetail | null> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return null;
  }

  const detail = await gmail.users.messages.get({
    userId: "me",
    id,
    format: "full",
  });

  return {
    id: detail.data.id!,
    subject: getHeader(detail.data.payload?.headers, "Subject") || "(제목 없음)",
    from: getHeader(detail.data.payload?.headers, "From"),
    date: getHeader(detail.data.payload?.headers, "Date"),
    snippet: detail.data.snippet ?? "",
    body: extractPlainTextBody(detail.data.payload) || detail.data.snippet || "",
  };
}

export async function sendEmail(params: { to: string; subject: string; body: string }): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  const message = [
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf8").toString("base64")}?=`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    params.body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
}

export async function trashMessage(id: string): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await gmail.users.messages.trash({ userId: "me", id });
}

export async function isGoogleConnected(): Promise<boolean> {
  const refreshToken = await getGoogleRefreshToken();
  return refreshToken !== null;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/google/gmailClient.test.ts`
Expected: PASS (8개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/google/gmailClient.ts lib/google/gmailClient.test.ts
git commit -m "feat: Gmail API 래퍼(목록/상세/발송/삭제) 추가"
```

---

### Task 5: Gmail 목록 페이지 UI

**Files:**
- Modify: `app/gmail/page.tsx`
- Create: `app/gmail/page.test.tsx`
- Modify: `app/placeholder-pages.test.tsx`

**Interfaces:**
- Consumes: `isGoogleConnected`, `listRecentMessages`, `type GmailMessageSummary` (Task 4)
- Produces: `/gmail` 페이지가 실제 Gmail 데이터를 보여주는 Server Component가 됨. Task 6이 이 페이지에서 `/gmail/[id]`, `/gmail/compose`로 링크를 건다.

- [ ] **Step 1: 실패하는 테스트 작성**

`app/gmail/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import GmailPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const isGoogleConnectedMock = vi.fn();
const listRecentMessagesMock = vi.fn();

vi.mock("@/lib/google/gmailClient", () => ({
  isGoogleConnected: isGoogleConnectedMock,
  listRecentMessages: listRecentMessagesMock,
}));

async function renderGmailPage() {
  const element = await GmailPage();
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("GmailPage", () => {
  beforeEach(() => {
    isGoogleConnectedMock.mockReset();
    listRecentMessagesMock.mockReset();
  });

  it("연결되지 않은 경우 Google 계정 연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(false);

    await renderGmailPage();

    expect(
      screen.getByText("Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google 계정 연결" })).toHaveAttribute(
      "href",
      "/api/auth/google/start"
    );
    expect(listRecentMessagesMock).not.toHaveBeenCalled();
  });

  it("연결된 경우 최근 메일 목록을 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([
      {
        id: "msg-1",
        subject: "테스트 제목",
        from: "sender@example.com",
        date: "2026-08-30",
        snippet: "미리보기",
      },
    ]);

    await renderGmailPage();

    expect(screen.getByText("테스트 제목")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /테스트 제목/ })).toHaveAttribute(
      "href",
      "/gmail/msg-1"
    );
  });

  it("연결되었지만 메일이 없으면 안내 문구를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([]);

    await renderGmailPage();

    expect(screen.getByText("받은 메일이 없습니다.")).toBeInTheDocument();
  });
});
```

Note: `GmailPage`는 `AppHeader`(내부에 `ThemeToggle` 포함)를 렌더링하므로, 1단계의 `app/page.test.tsx`/`AppHeader.test.tsx`와 동일하게 실제 `next-themes`의 `ThemeProvider`로 감싸야 한다 — 감싸지 않으면 `useTheme()`가 컨텍스트 기본값을 반환해 토글 라벨이 실제와 다르게 렌더링될 수 있다.

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/gmail/page.test.tsx`
Expected: FAIL — 현재 `app/gmail/page.tsx`는 플레이스홀더 문구만 보여줌.

- [ ] **Step 3: `app/gmail/page.tsx` 교체**

```tsx
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { isGoogleConnected, listRecentMessages } from "@/lib/google/gmailClient";

export default async function GmailPage() {
  const connected = await isGoogleConnected();
  const messages = connected ? await listRecentMessages() : [];

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-50">Gmail</h1>
          {connected ? (
            <Link
              href="/gmail/compose"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              새 메일 작성
            </Link>
          ) : null}
        </div>

        {!connected ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 연결
            </a>
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">받은 메일이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {messages.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/gmail/${message.id}`}
                  className="block px-4 py-3 hover:bg-neutral-800"
                >
                  <p className="text-sm font-medium text-neutral-50">{message.subject}</p>
                  <p className="text-xs text-neutral-400">{message.from}</p>
                  <p className="mt-1 text-xs text-neutral-500">{message.snippet}</p>
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

Run: `npx vitest run app/gmail/page.test.tsx`
Expected: PASS (3개 테스트 모두 통과)

- [ ] **Step 5: `app/placeholder-pages.test.tsx`에서 Gmail 관련 부분 제거**

`app/placeholder-pages.test.tsx` 전체를 아래로 교체 (Drive/Notion 테스트는 그대로 유지하고, Gmail 관련 import·테스트만 제거 — Gmail은 Step 1에서 만든 전용 테스트 파일로 대체됨):
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import DrivePage from "./drive/page";
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
  it("Drive 페이지는 한글 안내 문구와 홈으로 돌아가는 링크를 보여준다", () => {
    renderPage(<DrivePage />);
    expect(
      screen.getByText("Google Drive 연동 기능은 다음 단계에서 구현됩니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /홈으로/ })).toHaveAttribute("href", "/");
  });

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
git add app/gmail/page.tsx app/gmail/page.test.tsx app/placeholder-pages.test.tsx
git commit -m "feat: Gmail 목록 페이지를 실제 데이터로 연결"
```

---

### Task 6: 이메일 상세보기(삭제) + 새 메일 작성 + 홈 카드 문구 업데이트

**Files:**
- Create: `app/gmail/[id]/page.tsx`
- Create: `app/gmail/[id]/actions.ts`
- Create: `app/gmail/[id]/TrashButton.tsx`
- Test: `app/gmail/[id]/TrashButton.test.tsx`
- Create: `app/gmail/compose/actions.ts`
- Create: `app/gmail/compose/page.tsx`
- Test: `app/gmail/compose/page.test.tsx`
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`

**Interfaces:**
- Consumes: `getMessageDetail`, `trashMessage`, `sendEmail` (Task 4)
- Produces: `/gmail/[id]` 상세 페이지, `/gmail/compose` 작성 페이지. Gmail 기능이 이 계획 안에서 완결된다 (3단계는 Drive에만 집중).

- [ ] **Step 1: 상세 페이지용 삭제 Server Action 작성**

`app/gmail/[id]/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { trashMessage } from "@/lib/google/gmailClient";

export async function trashMessageAction(messageId: string): Promise<void> {
  await trashMessage(messageId);
  revalidatePath("/gmail");
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — 삭제 버튼**

`app/gmail/[id]/TrashButton.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrashButton } from "./TrashButton";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const trashMessageActionMock = vi.fn();

vi.mock("./actions", () => ({
  trashMessageAction: trashMessageActionMock,
}));

describe("TrashButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    trashMessageActionMock.mockReset();
  });

  it("클릭하면 삭제 액션을 호출하고 목록으로 이동한다", async () => {
    trashMessageActionMock.mockResolvedValue(undefined);

    render(<TrashButton messageId="msg-1" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(trashMessageActionMock).toHaveBeenCalledWith("msg-1"));
    expect(pushMock).toHaveBeenCalledWith("/gmail");
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/gmail/[id]/TrashButton.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 삭제 버튼 구현**

`app/gmail/[id]/TrashButton.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trashMessageAction } from "./actions";

export function TrashButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    setIsDeleting(true);
    await trashMessageAction(messageId);
    router.push("/gmail");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDeleting}
      className="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
    >
      {isDeleting ? "삭제 중..." : "삭제"}
    </button>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/gmail/[id]/TrashButton.test.tsx`
Expected: PASS

- [ ] **Step 6: 상세 페이지 작성**

`app/gmail/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getMessageDetail } from "@/lib/google/gmailClient";
import { TrashButton } from "./TrashButton";

export default async function GmailDetailPage({ params }: { params: { id: string } }) {
  const message = await getMessageDetail(params.id);

  if (!message) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/gmail" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-50">{message.subject}</h1>
            <p className="mt-1 text-sm text-neutral-400">{message.from}</p>
            <p className="text-xs text-neutral-500">{message.date}</p>
          </div>
          <TrashButton messageId={message.id} />
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm text-neutral-200">{message.body}</p>
      </div>
    </main>
  );
}
```

(이 페이지는 `notFound()` 분기와 실제 Gmail API 호출이 얽혀 있어 단위 테스트보다 수동 확인이 더 적합하다 — Task 6 마지막 단계의 전체 테스트/빌드 검증으로 회귀만 확인한다.)

- [ ] **Step 7: 발송 Server Action 작성**

`app/gmail/compose/actions.ts`:
```ts
"use server";

import { sendEmail } from "@/lib/google/gmailClient";

export async function sendEmailAction(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  await sendEmail(params);
}
```

- [ ] **Step 8: 실패하는 테스트 작성 — 작성 페이지**

`app/gmail/compose/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import ComposePage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const sendEmailActionMock = vi.fn();

vi.mock("./actions", () => ({
  sendEmailAction: sendEmailActionMock,
}));

function renderComposePage() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ComposePage />
    </ThemeProvider>
  );
}

describe("ComposePage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    sendEmailActionMock.mockReset();
  });

  it("발송에 성공하면 목록으로 이동한다", async () => {
    sendEmailActionMock.mockResolvedValue(undefined);

    renderComposePage();

    fireEvent.change(screen.getByLabelText("받는 사람"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "제목" } });
    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } });
    fireEvent.click(screen.getByRole("button", { name: "발송" }));

    await waitFor(() =>
      expect(sendEmailActionMock).toHaveBeenCalledWith({
        to: "a@example.com",
        subject: "제목",
        body: "본문",
      })
    );
    expect(pushMock).toHaveBeenCalledWith("/gmail");
  });

  it("발송에 실패하면 한글 에러 메시지를 보여준다", async () => {
    sendEmailActionMock.mockRejectedValue(new Error("send failed"));

    renderComposePage();

    fireEvent.change(screen.getByLabelText("받는 사람"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "제목" } });
    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } });
    fireEvent.click(screen.getByRole("button", { name: "발송" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  });
});
```

- [ ] **Step 9: 테스트 실패 확인**

Run: `npx vitest run app/gmail/compose/page.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 10: 작성 페이지 구현**

`app/gmail/compose/page.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { sendEmailAction } from "./actions";

export default function ComposePage() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSending(true);

    try {
      await sendEmailAction({ to, subject, body });
      router.push("/gmail");
      router.refresh();
    } catch {
      setErrorMessage("메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/gmail" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">새 메일 작성</h1>

        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
          <div className="space-y-1">
            <label htmlFor="to" className="text-sm text-neutral-300">
              받는 사람
            </label>
            <input
              id="to"
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="subject" className="text-sm text-neutral-300">
              제목
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="body" className="text-sm text-neutral-300">
              내용
            </label>
            <textarea
              id="body"
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSending ? "발송 중..." : "발송"}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 11: 테스트 통과 확인**

Run: `npx vitest run app/gmail/compose/page.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 12: 홈 화면 Gmail 카드 문구 업데이트**

`app/page.tsx` 전체를 아래로 교체 (Gmail 카드의 `description`만 변경, 나머지는 동일):
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
          description="Drive 연동 준비 중입니다."
          href="/drive"
        />
        <ServiceSummaryCard title="Notion" description="Notion 연동 준비 중입니다." href="/notion" />
      </div>
    </main>
  );
}
```

`app/page.test.tsx` 전체를 아래로 교체 (첫 번째 테스트의 Gmail 문구만 변경, 나머지는 동일):
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
    expect(screen.getByText("Drive 연동 준비 중입니다.")).toBeInTheDocument();
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

`README.md`의 "## 진행 현황" 섹션에서 2단계 항목을 완료로 표시:
```markdown
## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [ ] 3단계: Google Drive 연동
- [ ] 4단계: Notion 연동
- [ ] 5단계: 홈 화면 통합
```

- [ ] **Step 13: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 14: 커밋**

```bash
git add app/gmail/[id]/page.tsx app/gmail/[id]/actions.ts app/gmail/[id]/TrashButton.tsx app/gmail/[id]/TrashButton.test.tsx app/gmail/compose/actions.ts app/gmail/compose/page.tsx app/gmail/compose/page.test.tsx app/page.tsx app/page.test.tsx README.md
git commit -m "feat: 이메일 상세보기/삭제, 새 메일 작성 기능 추가"
```
