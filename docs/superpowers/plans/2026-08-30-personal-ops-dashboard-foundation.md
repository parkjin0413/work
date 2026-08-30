# 개인 업무 대시보드 - 기반 구축(Foundation) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js + Supabase 기반 위에 관리자 1인 인증, 다크모드 기본 테마(+라이트 토글), 홈 요약 화면과 `/gmail` `/drive` `/notion` 빈 라우트까지 갖춘 뼈대를 완성한다. 이 계획은 5단계 중 1단계이며, 완료 후 Gmail/Drive/Notion 연동 계획이 각각 이어진다.

**Architecture:** App Router 기반 Next.js 프로젝트를 저장소 루트(`C:\Users\Windows11\Desktop\VSCODE\work`)에 직접 생성한다. Supabase Auth로 단일 관리자 계정만 로그인 가능하게 하고, Next.js 미들웨어가 모든 라우트를 보호한다. 인증 판별 로직은 순수 함수로 분리해 단위 테스트하고, 미들웨어는 그 함수를 얇게 감싸기만 한다.

**Tech Stack:** Next.js 14 (App Router, TypeScript) · Tailwind CSS 3 · @supabase/ssr · next-themes · Vitest + Testing Library

**Spec:** [docs/superpowers/specs/2026-08-30-personal-ops-dashboard-design.md](../specs/2026-08-30-personal-ops-dashboard-design.md)

## Global Constraints

- 관리자 계정은 정확히 1명이며, 모든 라우트는 로그인 + 관리자 이메일 일치 여부로 보호한다 (스펙 §5).
- 다크모드가 기본값이며, 라이트 모드로 전환하는 토글을 반드시 제공한다 (스펙 §9).
- 대시보드의 모든 사용자 노출 텍스트(라벨, 버튼, 안내 문구, 에러 메시지)는 한글로 작성한다. 코드 식별자(변수/함수/컴포넌트명)는 영어 관례를 따른다 (스펙 §9, 한글 UI 요구사항).
- 스택은 Next.js + Supabase + GitHub + Vercel로 고정한다 (스펙 §4).
- 회원가입 UI는 만들지 않는다 (스펙 §5).

---

### Task 1: 프로젝트 스캐폴딩 + Tailwind + 기본 레이아웃

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.env.local.example`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `.eslintrc.json`
- Create: `app/globals.css`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`

**Interfaces:**
- Produces: 실행 가능한 Next.js 앱 골격. `app/layout.tsx`는 이후 Task 5에서 `ThemeProvider`로 감싸도록 수정된다. `app/page.tsx`는 이후 Task 6에서 실제 홈 요약 화면으로 교체된다.

- [ ] **Step 1: `.gitignore` 작성**

```gitignore
node_modules
.next
.env.local
.env*.local
npm-debug.log*
.vercel
coverage
```

- [ ] **Step 2: `package.json` 작성**

```json
{
  "name": "personal-ops-dashboard",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run"
  },
  "dependencies": {
    "next": "14.2.15",
    "next-themes": "0.3.0",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "@supabase/ssr": "0.5.1",
    "@supabase/supabase-js": "2.45.4"
  },
  "devDependencies": {
    "typescript": "5.5.4",
    "@types/node": "22.5.4",
    "@types/react": "18.3.5",
    "@types/react-dom": "18.3.0",
    "tailwindcss": "3.4.10",
    "postcss": "8.4.41",
    "autoprefixer": "10.4.20",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.15",
    "vitest": "2.0.5",
    "@vitejs/plugin-react": "4.3.1",
    "@testing-library/react": "16.0.0",
    "@testing-library/jest-dom": "6.4.8",
    "jsdom": "25.0.0"
  }
}
```

- [ ] **Step 3: 의존성 설치**

Run: `npm install`
Expected: `node_modules`가 생성되고 에러 없이 종료됨.

- [ ] **Step 4: TypeScript / Next / Tailwind / ESLint 설정 파일 작성**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
```

`postcss.config.js`:
```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

`.eslintrc.json`:
```json
{
  "extends": "next/core-web-vitals"
}
```

- [ ] **Step 5: 전역 스타일 및 레이아웃 작성**

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  color-scheme: dark;
}
```

`app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "개인 업무 대시보드",
  description: "Gmail, Google Drive, Notion을 한 곳에서 관리하는 개인 업무 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx` (임시 홈 화면 — Task 6에서 교체됨):
```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950">
      <h1 className="text-2xl font-semibold text-neutral-50">개인 업무 대시보드</h1>
    </main>
  );
}
```

- [ ] **Step 6: `.env.local.example` 작성**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ADMIN_EMAIL=
```

- [ ] **Step 7: 빌드로 검증**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공. (이 시점엔 자동화 테스트가 없으므로 빌드 성공이 검증 기준)

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json .gitignore .env.local.example tsconfig.json next.config.ts tailwind.config.ts postcss.config.js .eslintrc.json app/globals.css app/layout.tsx app/page.tsx
git commit -m "chore: Next.js 프로젝트 골격 및 Tailwind 설정 추가"
```

---

### Task 2: 테스트 환경 구성 + 관리자 판별 로직

**Files:**
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `lib/auth/isAdminUser.ts`
- Test: `lib/auth/isAdminUser.test.ts`
- Modify: `package.json:devDependencies` (필요 시 누락 패키지 없는지만 확인, Task 1에서 이미 포함됨)

**Interfaces:**
- Consumes: 없음 (독립 유틸리티)
- Produces: `isAdminUser(email: string | null | undefined): boolean` — `lib/auth/isAdminUser.ts`에서 export. Task 3의 `resolveRedirect`가 이 함수를 사용함.

- [ ] **Step 1: Vitest 설정 작성**

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

`vitest.setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 2: 실패하는 테스트 작성**

`lib/auth/isAdminUser.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminUser } from "./isAdminUser";

describe("isAdminUser", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("관리자 이메일과 대소문자 무관하게 일치하면 true를 반환한다", () => {
    expect(isAdminUser("Admin@Example.com")).toBe(true);
  });

  it("관리자 이메일과 다르면 false를 반환한다", () => {
    expect(isAdminUser("someone@else.com")).toBe(false);
  });

  it("이메일이 null 또는 undefined면 false를 반환한다", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("ADMIN_EMAIL 환경변수가 없으면 false를 반환한다", () => {
    delete process.env.ADMIN_EMAIL;
    expect(isAdminUser("admin@example.com")).toBe(false);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/auth/isAdminUser.test.ts`
Expected: FAIL — `lib/auth/isAdminUser.ts`가 없어서 모듈을 찾을 수 없다는 에러.

- [ ] **Step 4: 최소 구현 작성**

`lib/auth/isAdminUser.ts`:
```ts
export function isAdminUser(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/auth/isAdminUser.test.ts`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 6: 커밋**

```bash
git add vitest.config.ts vitest.setup.ts lib/auth/isAdminUser.ts lib/auth/isAdminUser.test.ts package.json package-lock.json
git commit -m "test: 관리자 판별 로직(isAdminUser) 및 Vitest 환경 추가"
```

---

### Task 3: Supabase 클라이언트 헬퍼 + 인증 미들웨어

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/auth/resolveRedirect.ts`
- Test: `lib/auth/resolveRedirect.test.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `isAdminUser` (Task 2, `lib/auth/isAdminUser.ts`)
- Produces:
  - `createSupabaseServerClient(): SupabaseClient` — `lib/supabase/server.ts`.이후 Gmail/Drive/Notion 연동 계획에서 서버 쪽 Supabase 접근에 사용.
  - `createSupabaseBrowserClient(): SupabaseClient` — `lib/supabase/client.ts`. Task 4(로그인), Task 6(로그아웃)에서 사용.
  - `resolveRedirect(pathname: string, session: MiddlewareSession): string | null`과 타입 `MiddlewareSession = { email: string | null | undefined } | null` — `lib/auth/resolveRedirect.ts`.

- [ ] **Step 1: Supabase 서버/브라우저 클라이언트 헬퍼 작성**

`lib/supabase/server.ts`:
```ts
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

`lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — 리다이렉트 판별 로직**

`lib/auth/resolveRedirect.test.ts`:
```ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveRedirect } from "./resolveRedirect";

describe("resolveRedirect", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("로그인하지 않은 사용자가 보호된 경로에 접근하면 /login으로 보낸다", () => {
    expect(resolveRedirect("/", null)).toBe("/login");
  });

  it("관리자가 아닌 사용자가 보호된 경로에 접근하면 /login으로 보낸다", () => {
    expect(resolveRedirect("/gmail", { email: "someone@else.com" })).toBe("/login");
  });

  it("관리자가 보호된 경로에 접근하면 리다이렉트하지 않는다", () => {
    expect(resolveRedirect("/drive", { email: "admin@example.com" })).toBeNull();
  });

  it("이미 로그인한 관리자가 /login에 접근하면 홈으로 보낸다", () => {
    expect(resolveRedirect("/login", { email: "admin@example.com" })).toBe("/");
  });

  it("로그인하지 않은 사용자가 /login에 접근하면 리다이렉트하지 않는다", () => {
    expect(resolveRedirect("/login", null)).toBeNull();
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run lib/auth/resolveRedirect.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 4: 최소 구현 작성**

`lib/auth/resolveRedirect.ts`:
```ts
import { isAdminUser } from "./isAdminUser";

export type MiddlewareSession = { email: string | null | undefined } | null;

const PUBLIC_PATHS = ["/login"];

export function resolveRedirect(pathname: string, session: MiddlewareSession): string | null {
  const isPublicPath = PUBLIC_PATHS.includes(pathname);
  const isAuthorized = session !== null && isAdminUser(session.email);

  if (!isAuthorized && !isPublicPath) {
    return "/login";
  }

  if (isAuthorized && isPublicPath) {
    return "/";
  }

  return null;
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run lib/auth/resolveRedirect.test.ts`
Expected: PASS (5개 테스트 모두 통과)

- [ ] **Step 6: 미들웨어 작성**

`middleware.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { resolveRedirect } from "@/lib/auth/resolveRedirect";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = resolveRedirect(
    request.nextUrl.pathname,
    user ? { email: user.email } : null
  );

  if (redirectTo) {
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return response;
}

export const config = {
  matcher: ["/", "/login", "/gmail/:path*", "/drive/:path*", "/notion/:path*"],
};
```

- [ ] **Step 7: 빌드로 통합 검증**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공 (미들웨어 포함).

- [ ] **Step 8: 커밋**

```bash
git add lib/supabase/server.ts lib/supabase/client.ts lib/auth/resolveRedirect.ts lib/auth/resolveRedirect.test.ts middleware.ts
git commit -m "feat: Supabase 클라이언트 헬퍼와 관리자 인증 미들웨어 추가"
```

---

### Task 4: 로그인 페이지 (한글 UI)

**Files:**
- Create: `app/login/page.tsx`
- Test: `app/login/page.test.tsx`

**Interfaces:**
- Consumes: `createSupabaseBrowserClient` (Task 3, `lib/supabase/client.ts`)
- Produces: `/login` 라우트에 렌더링되는 `LoginPage` 컴포넌트 (기본 export).

- [ ] **Step 1: 실패하는 테스트 작성**

`app/login/page.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInWithPasswordMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signInWithPasswordMock.mockClear();
  });

  it("로그인 실패 시 한글 에러 메시지를 보여준다", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid" } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이메일 또는 비밀번호가 올바르지 않습니다."
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("로그인 성공 시 홈으로 이동한다", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/login/page.test.tsx`
Expected: FAIL — `app/login/page.tsx` 없음.

- [ ] **Step 3: 최소 구현 작성**

`app/login/page.tsx`:
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage("이메일 또는 비밀번호가 올바르지 않습니다.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-xl font-semibold text-neutral-50">관리자 로그인</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-neutral-300">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-50"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-neutral-300">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-50"
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run app/login/page.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add app/login/page.tsx app/login/page.test.tsx
git commit -m "feat: 관리자 로그인 페이지(한글 UI) 추가"
```

---

### Task 5: 다크모드 기본 테마 + 라이트 모드 토글

**Files:**
- Create: `components/theme/ThemeProvider.tsx`
- Create: `components/theme/ThemeToggle.tsx`
- Test: `components/theme/ThemeToggle.test.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: 없음 (next-themes 라이브러리 사용)
- Produces: `ThemeProvider` (children을 감싸는 컴포넌트, `components/theme/ThemeProvider.tsx`), `ThemeToggle` (버튼 컴포넌트, `components/theme/ThemeToggle.tsx`). Task 6의 `AppHeader`가 `ThemeToggle`을 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

`components/theme/ThemeToggle.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";

function renderWithTheme() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  it("다크 모드일 때 라이트 모드로 전환하는 버튼을 보여준다", async () => {
    renderWithTheme();
    expect(await screen.findByRole("button", { name: "라이트 모드로 전환" })).toBeInTheDocument();
  });

  it("버튼을 클릭하면 다크 모드로 전환하는 옵션으로 바뀐다", async () => {
    renderWithTheme();
    const button = await screen.findByRole("button", { name: "라이트 모드로 전환" });
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/theme/ThemeToggle.test.tsx`
Expected: FAIL — `components/theme/ThemeToggle.tsx` 없음.

- [ ] **Step 3: 최소 구현 작성**

`components/theme/ThemeProvider.tsx`:
```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {children}
    </NextThemesProvider>
  );
}
```

`components/theme/ThemeToggle.tsx`:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200"
    >
      {isDark ? "라이트 모드" : "다크 모드"}
    </button>
  );
}
```

Note: `aria-label`과 버튼의 접근 가능한 이름(accessible name)이 같은 문자열이므로 위 테스트의 `getByRole("button", { name: ... })`가 정확히 매칭된다.

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/theme/ThemeToggle.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 5: 레이아웃에 ThemeProvider 적용**

`app/layout.tsx` 전체를 아래로 교체:
```tsx
import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "개인 업무 대시보드",
  description: "Gmail, Google Drive, Notion을 한 곳에서 관리하는 개인 업무 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: 빌드로 통합 검증**

Run: `npm run build`
Expected: 타입 에러 없이 빌드 성공.

- [ ] **Step 7: 커밋**

```bash
git add components/theme/ThemeProvider.tsx components/theme/ThemeToggle.tsx components/theme/ThemeToggle.test.tsx app/layout.tsx
git commit -m "feat: 다크모드 기본 테마와 라이트 모드 토글 추가"
```

---

### Task 6: 홈 요약 화면 + 서비스별 빈 라우트 + 로그아웃

**Files:**
- Create: `components/layout/AppHeader.tsx`
- Test: `components/layout/AppHeader.test.tsx`
- Create: `components/dashboard/ServiceSummaryCard.tsx`
- Modify: `app/page.tsx`
- Test: `app/page.test.tsx`
- Create: `app/gmail/page.tsx`
- Create: `app/drive/page.tsx`
- Create: `app/notion/page.tsx`
- Test: `app/placeholder-pages.test.tsx`
- Create: `README.md`

**Interfaces:**
- Consumes: `createSupabaseBrowserClient` (Task 3), `ThemeToggle` (Task 5)
- Produces: `AppHeader` (`components/layout/AppHeader.tsx`), `ServiceSummaryCard` (`components/dashboard/ServiceSummaryCard.tsx`, props `{ title: string; description: string }`). 이후 Gmail/Drive/Notion 연동 계획에서 `app/gmail/page.tsx` 등을 실제 데이터로 교체하고, `ServiceSummaryCard`를 홈 화면 요약에 재사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 — AppHeader**

`components/layout/AppHeader.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { AppHeader } from "./AppHeader";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: signOutMock },
  }),
}));

function renderHeader() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppHeader />
    </ThemeProvider>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signOutMock.mockClear();
    signOutMock.mockResolvedValue({ error: null });
  });

  it("대시보드 제목을 한글로 보여준다", () => {
    renderHeader();
    expect(screen.getByText("개인 업무 대시보드")).toBeInTheDocument();
  });

  it("로그아웃 버튼을 누르면 로그아웃 후 로그인 화면으로 이동한다", async () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/layout/AppHeader.test.tsx`
Expected: FAIL — `components/layout/AppHeader.tsx` 없음.

- [ ] **Step 3: 최소 구현 작성 — AppHeader, ServiceSummaryCard**

`components/layout/AppHeader.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function AppHeader() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
      <h1 className="text-lg font-semibold text-neutral-50">개인 업무 대시보드</h1>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-200"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
```

`components/dashboard/ServiceSummaryCard.tsx`:
```tsx
type ServiceSummaryCardProps = {
  title: string;
  description: string;
};

export function ServiceSummaryCard({ title, description }: ServiceSummaryCardProps) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <h2 className="text-base font-semibold text-neutral-50">{title}</h2>
      <p className="mt-2 text-sm text-neutral-400">{description}</p>
    </section>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/layout/AppHeader.test.tsx`
Expected: PASS (2개 테스트 모두 통과)

- [ ] **Step 5: 홈 화면을 실제 요약 레이아웃으로 교체 + 실패하는 테스트 작성**

`app/page.test.tsx`:
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

    expect(screen.getByText("Gmail 연동 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByText("Drive 연동 준비 중입니다.")).toBeInTheDocument();
    expect(screen.getByText("Notion 연동 준비 중입니다.")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — 기존 `app/page.tsx`에는 저 문구가 없음.

- [ ] **Step 6: `app/page.tsx` 교체**

```tsx
import { AppHeader } from "@/components/layout/AppHeader";
import { ServiceSummaryCard } from "@/components/dashboard/ServiceSummaryCard";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="grid grid-cols-1 gap-4 p-6 sm:grid-cols-3">
        <ServiceSummaryCard title="Gmail" description="Gmail 연동 준비 중입니다." />
        <ServiceSummaryCard title="Google Drive" description="Drive 연동 준비 중입니다." />
        <ServiceSummaryCard title="Notion" description="Notion 연동 준비 중입니다." />
      </div>
    </main>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS

- [ ] **Step 8: 서비스별 빈 라우트 작성 + 테스트**

`app/gmail/page.tsx`:
```tsx
export default function GmailPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6">
      <h1 className="text-lg font-semibold text-neutral-50">Gmail</h1>
      <p className="mt-2 text-sm text-neutral-400">Gmail 연동 기능은 다음 단계에서 구현됩니다.</p>
    </main>
  );
}
```

`app/drive/page.tsx`:
```tsx
export default function DrivePage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6">
      <h1 className="text-lg font-semibold text-neutral-50">Google Drive</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Google Drive 연동 기능은 다음 단계에서 구현됩니다.
      </p>
    </main>
  );
}
```

`app/notion/page.tsx`:
```tsx
export default function NotionPage() {
  return (
    <main className="min-h-screen bg-neutral-950 p-6">
      <h1 className="text-lg font-semibold text-neutral-50">Notion</h1>
      <p className="mt-2 text-sm text-neutral-400">Notion 연동 기능은 다음 단계에서 구현됩니다.</p>
    </main>
  );
}
```

`app/placeholder-pages.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GmailPage from "./gmail/page";
import DrivePage from "./drive/page";
import NotionPage from "./notion/page";

describe("서비스별 빈 라우트", () => {
  it("Gmail 페이지는 한글 안내 문구를 보여준다", () => {
    render(<GmailPage />);
    expect(screen.getByText("Gmail 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
  });

  it("Drive 페이지는 한글 안내 문구를 보여준다", () => {
    render(<DrivePage />);
    expect(
      screen.getByText("Google Drive 연동 기능은 다음 단계에서 구현됩니다.")
    ).toBeInTheDocument();
  });

  it("Notion 페이지는 한글 안내 문구를 보여준다", () => {
    render(<NotionPage />);
    expect(screen.getByText("Notion 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
  });
});
```

Run: `npx vitest run app/placeholder-pages.test.tsx`
Expected: PASS (파일들을 먼저 만들었으므로 바로 통과 — 이 3개 페이지는 로직이 없는 정적 페이지라 실패 단계를 생략함)

- [ ] **Step 9: README 작성**

`README.md`:
```markdown
# 개인 업무 대시보드

Gmail, Google Drive, Notion을 한 곳에서 관리하는 관리자 전용 개인 업무 대시보드입니다.

## 요구 사항

- Node.js 18.17 이상
- Supabase 프로젝트 1개
- Google Cloud 프로젝트 1개 (Gmail/Drive 연동 단계에서 필요)
- Notion Internal Integration (Notion 연동 단계에서 필요)

## 로컬 실행

1. 의존성 설치: `npm install`
2. `.env.local.example`을 복사해 `.env.local` 생성 후 값 채우기
3. 개발 서버 실행: `npm run dev`
4. 테스트 실행: `npm test`

## Supabase 설정

1. https://supabase.com 에서 새 프로젝트 생성
2. 프로젝트 설정 > API 메뉴에서 URL과 anon key를 `.env.local`의
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`에 입력
3. Authentication > Users 메뉴에서 관리자 계정 1개를 직접 생성
   (회원가입 화면이 없으므로 반드시 Supabase 콘솔에서 생성해야 함)
4. 생성한 관리자 이메일을 `.env.local`의 `ADMIN_EMAIL`에 입력

## GitHub / Vercel 연결

1. 이 저장소를 GitHub 원격 저장소에 push
2. Vercel에서 해당 GitHub 저장소를 Import
3. Vercel 프로젝트 설정 > Environment Variables에 `.env.local`과 동일한
   값을 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`)
4. main 브랜치에 push하면 자동 배포됨

## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [ ] 2단계: Gmail 연동
- [ ] 3단계: Google Drive 연동
- [ ] 4단계: Notion 연동
- [ ] 5단계: 홈 화면 통합
```

- [ ] **Step 10: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 모든 테스트 PASS

Run: `npm run build`
Expected: 빌드 성공

- [ ] **Step 11: 커밋**

```bash
git add components/layout/AppHeader.tsx components/layout/AppHeader.test.tsx components/dashboard/ServiceSummaryCard.tsx app/page.tsx app/page.test.tsx app/gmail/page.tsx app/drive/page.tsx app/notion/page.tsx app/placeholder-pages.test.tsx README.md
git commit -m "feat: 홈 요약 화면, 서비스별 빈 라우트, 로그아웃 기능 추가"
```
