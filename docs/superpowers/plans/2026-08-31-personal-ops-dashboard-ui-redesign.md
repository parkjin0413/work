# 개인 업무 대시보드 UI 리디자인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 참고 이미지("MarketSavy" 스타일)의 톤을 반영한 색상 토큰(다크+라이트)·타이포그래피·좌측 사이드바 내비게이션·아이콘·카드/버튼/폼 스타일을 정의하고, 기존 8개 페이지(로그인, 홈, Gmail 3개, Drive, Notion 2개)와 `app/error.tsx`에 일관되게 적용한다.

**Architecture:** CSS 커스텀 프로퍼티로 다크/라이트 시맨틱 토큰을 정의하고 `tailwind.config.ts`에 매핑해 `bg-surface`, `text-muted` 같은 유틸리티 클래스로 사용한다. 기존 `AppHeader`(상단바)를 삭제하고 새 `Sidebar` 컴포넌트(좌측 고정 내비게이션)로 대체한다. 새 기능/데이터 흐름은 없다 — 순수 스타일링·레이아웃 변경이다.

**Tech Stack:** 기존 스택 + `lucide-react`(아이콘, 신규 의존성), `next/font/google`의 `Noto_Sans_KR`(신규 npm 패키지 불필요, Next.js 자체 호스팅)

**Spec:** [docs/superpowers/specs/2026-08-31-personal-ops-dashboard-ui-redesign-design.md](../specs/2026-08-31-personal-ops-dashboard-ui-redesign-design.md)

## Global Constraints

- 모든 사용자 노출 텍스트는 한글로 작성한다 (기존 텍스트 문구는 절대 변경하지 않는다 — 오직 클래스/구조만 바꾼다).
- 새로운 기능, Server Action, 데이터 흐름을 추가하지 않는다 — 순수 스타일링·레이아웃 작업이다.
- 색상은 반드시 시맨틱 토큰 클래스(`bg-bg`, `bg-surface`, `bg-surface-hover`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `hover:bg-accent-hover`, `text-accent-foreground`, `text-accent`, `bg-accent/10`, `border-danger`, `bg-danger-bg`, `text-danger`, `border-success`, `bg-success-bg`, `text-success`)만 사용한다 — `bg-neutral-*`, `bg-blue-600`, `text-red-400`, `border-green-800` 같은 기존 raw Tailwind 팔레트 클래스는 전부 제거한다.
- 카드는 `rounded-2xl`, 버튼/인풋은 `rounded-lg`(작은 인라인 버튼은 `rounded-md` 유지 가능)를 사용한다.
- `Sidebar`는 순수 내비게이션 역할만 한다 — 페이지별 제목/액션 버튼은 각 페이지 콘텐츠 영역에 그대로 둔다. `Sidebar`의 "홈" 메뉴가 이미 홈으로 가는 경로를 제공하므로, Drive/Notion 목록 페이지에 있던 중복된 "← 홈으로" 링크는 제거한다.
- 각 페이지 테스트가 이미 `next/navigation`을 모킹하고 있다 — `Sidebar`를 그 페이지에 추가하면 `Sidebar`가 내부적으로 쓰는 `usePathname`도 함께 모킹해야 해당 테스트가 깨지지 않는다 (아래 각 태스크에서 정확한 위치를 지정한다).
- 기존 텍스트/href/접근성 이름(aria-label 등)은 절대 변경하지 않는다 — 그래야 대부분의 기존 테스트가 수정 없이 통과한다.

---

### Task 1: 디자인 토큰 & 폰트 & 아이콘 라이브러리 기반

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: 없음
- Produces: Tailwind 유틸리티 클래스 `bg-bg`, `bg-surface`, `bg-surface-hover`, `border-border`, `text-foreground`, `text-muted`, `bg-accent`, `bg-accent-hover`, `text-accent-foreground`, `bg-danger`, `bg-danger-bg`, `text-danger`, `bg-success`, `bg-success-bg`, `text-success`, `font-sans`(Noto Sans KR 적용). `lucide-react` 패키지. 이후 모든 태스크가 이 클래스들과 아이콘을 사용한다.

이 태스크는 순수 설정 변경(색상 토큰, 폰트, 의존성 추가)이라 새로운 로직이 없어 TDD 사이클(실패하는 테스트 작성) 없이 진행한다 — 기존 전체 테스트 스위트가 그대로 통과하는지와 빌드 성공 여부로 검증한다.

- [ ] **Step 1: `tailwind.config.ts` 교체**

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        "surface-hover": "var(--color-surface-hover)",
        border: "var(--color-border)",
        foreground: "var(--color-text)",
        muted: "var(--color-text-muted)",
        accent: "var(--color-accent)",
        "accent-hover": "var(--color-accent-hover)",
        "accent-foreground": "var(--color-accent-foreground)",
        danger: "var(--color-danger)",
        "danger-bg": "var(--color-danger-bg)",
        success: "var(--color-success)",
        "success-bg": "var(--color-success-bg)",
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-kr)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: `app/globals.css` 교체**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --color-bg: #F7F7F9;
  --color-surface: #FFFFFF;
  --color-surface-hover: #F1F1F4;
  --color-border: #E4E4E9;
  --color-text: #121214;
  --color-text-muted: #6B6B76;
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-accent-foreground: #FFFFFF;
  --color-danger: #DC2626;
  --color-danger-bg: #FEE2E2;
  --color-success: #16A34A;
  --color-success-bg: #DCFCE7;
}

.dark {
  --color-bg: #0B0B0F;
  --color-surface: #16161C;
  --color-surface-hover: #1E1E26;
  --color-border: #2A2A33;
  --color-text: #F5F5F7;
  --color-text-muted: #9A9AA5;
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-accent-foreground: #FFFFFF;
  --color-danger: #EF4444;
  --color-danger-bg: #3F1D1D;
  --color-success: #22C55E;
  --color-success-bg: #14301F;
}

html {
  color-scheme: light;
}

html.dark {
  color-scheme: dark;
}
```

- [ ] **Step 3: `app/layout.tsx` 교체**

```tsx
import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import "./globals.css";

const notoSansKR = Noto_Sans_KR({
  subsets: ["latin", "korean"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-kr",
});

export const metadata: Metadata = {
  title: "개인 업무 대시보드",
  description: "Gmail, Google Drive, Notion을 한 곳에서 관리하는 개인 업무 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={notoSansKR.variable}>
      <body className="bg-bg font-sans text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: `package.json`에 `lucide-react` 의존성 추가**

`dependencies` 객체에서 `"googleapis"` 줄 다음, `"next"` 줄 앞에 아래 줄을 추가한다 (알파벳 순서 유지):

```json
    "lucide-react": "^0.400.0",
```

전체 `dependencies` 블록은 다음과 같아야 한다:

```json
  "dependencies": {
    "@notionhq/client": "^2.3.0",
    "@supabase/ssr": "0.5.1",
    "@supabase/supabase-js": "2.45.4",
    "googleapis": "^176.0.0",
    "lucide-react": "^0.400.0",
    "next": "14.2.35",
    "next-themes": "0.3.0",
    "react": "18.3.1",
    "react-dom": "18.3.1"
  },
```

- [ ] **Step 5: 의존성 설치**

Run: `npm install`
Expected: `lucide-react`가 `node_modules`에 설치되고 `package-lock.json`이 갱신됨. 에러 없이 종료.

- [ ] **Step 6: 기존 전체 테스트 스위트 회귀 확인**

Run: `npm test`
Expected: 변경 전과 동일하게 33개 파일, 165개 테스트 모두 PASS (이 태스크는 로직을 건드리지 않으므로 회귀 없음).

- [ ] **Step 7: 빌드 확인**

Run: `npm run build`
Expected: 빌드 성공 (`Compiled successfully`).

- [ ] **Step 8: 커밋**

```bash
git add tailwind.config.ts app/globals.css app/layout.tsx package.json package-lock.json
git commit -m "feat: 디자인 토큰(다크/라이트)과 Noto Sans KR 폰트, lucide-react 의존성 추가"
```

---

### Task 2: Sidebar 컴포넌트 + ThemeToggle 아이콘화

**Files:**
- Create: `components/layout/Sidebar.tsx`
- Test: `components/layout/Sidebar.test.tsx`
- Modify: `components/theme/ThemeToggle.tsx`

**Interfaces:**
- Consumes: Task 1의 `bg-surface`, `border-border`, `text-foreground`, `text-muted`, `bg-accent/10`, `text-accent`, `hover:bg-surface-hover` 클래스, `lucide-react`의 `LayoutDashboard`/`Mail`/`HardDrive`/`NotebookText`/`LogOut`/`Sun`/`Moon` 아이콘, `@/lib/supabase/client`의 `createSupabaseBrowserClient`
- Produces: `Sidebar()` 컴포넌트 (`components/layout/Sidebar.tsx`, named export `Sidebar`) — Task 3~6이 각 페이지에서 `import { Sidebar } from "@/components/layout/Sidebar"`로 사용한다. 아직 어떤 페이지에도 연결하지 않는다 (기존 `AppHeader`는 이 태스크에서 그대로 둔다 — 아직 7개 페이지가 참조 중이므로 삭제하면 빌드가 깨진다).

이 컴포넌트는 `usePathname()`을 사용하므로, 이후 태스크에서 `Sidebar`를 페이지에 추가할 때마다 해당 페이지의 테스트 파일에 `usePathname` 모킹을 추가해야 한다 (Global Constraints 참고).

- [ ] **Step 1: 실패하는 테스트 작성**

`components/layout/Sidebar.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { Sidebar } from "./Sidebar";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: usePathnameMock,
}));

const signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: signOutMock },
  }),
}));

function renderSidebar() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <Sidebar />
    </ThemeProvider>
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signOutMock.mockClear();
    signOutMock.mockResolvedValue({ error: null });
    usePathnameMock.mockReturnValue("/");
  });

  it("대시보드 제목을 한글로 보여준다", () => {
    renderSidebar();
    expect(screen.getByText("개인 업무 대시보드")).toBeInTheDocument();
  });

  it("4개의 메뉴 링크를 올바른 경로로 보여준다", () => {
    renderSidebar();
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Gmail" })).toHaveAttribute("href", "/gmail");
    expect(screen.getByRole("link", { name: "Drive" })).toHaveAttribute("href", "/drive");
    expect(screen.getByRole("link", { name: "Notion" })).toHaveAttribute("href", "/notion");
  });

  it("현재 경로의 메뉴 항목에 aria-current를 표시한다", () => {
    usePathnameMock.mockReturnValue("/gmail");
    renderSidebar();

    expect(screen.getByRole("link", { name: "Gmail" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "홈" })).not.toHaveAttribute("aria-current");
  });

  it("로그아웃 버튼을 누르면 로그아웃 후 로그인 화면으로 이동한다", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /로그아웃/ }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run components/layout/Sidebar.test.tsx`
Expected: FAIL — `./Sidebar` 모듈이 없음.

- [ ] **Step 3: Sidebar 구현**

`components/layout/Sidebar.tsx`:
```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { HardDrive, LayoutDashboard, LogOut, Mail, NotebookText } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_ITEMS = [
  { href: "/", label: "홈", icon: LayoutDashboard },
  { href: "/gmail", label: "Gmail", icon: Mail },
  { href: "/drive", label: "Drive", icon: HardDrive },
  { href: "/notion", label: "Notion", icon: NotebookText },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <nav
      aria-label="주요 메뉴"
      className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 md:h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6"
    >
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-base font-semibold text-foreground">개인 업무 대시보드</span>
      </div>

      <ul className="flex flex-1 flex-row items-center justify-center gap-1 md:mt-8 md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden items-center gap-2 md:flex md:flex-col md:items-stretch md:gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          로그아웃
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run components/layout/Sidebar.test.tsx`
Expected: PASS (4개 테스트 모두 통과)

- [ ] **Step 5: ThemeToggle에 아이콘 추가**

`components/theme/ThemeToggle.tsx` 교체:
```tsx
"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

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
      className="flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
    >
      {isDark ? (
        <Sun className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Moon className="h-4 w-4" aria-hidden="true" />
      )}
      {isDark ? "라이트 모드" : "다크 모드"}
    </button>
  );
}
```

`aria-label`과 버튼 텍스트("라이트 모드"/"다크 모드")는 그대로이므로 기존 `components/theme/ThemeToggle.test.tsx`는 수정 없이 통과해야 한다.

- [ ] **Step 6: ThemeToggle 기존 테스트 회귀 확인**

Run: `npx vitest run components/theme/ThemeToggle.test.tsx`
Expected: PASS (기존 2개 테스트 그대로 통과)

- [ ] **Step 7: 커밋**

```bash
git add components/layout/Sidebar.tsx components/layout/Sidebar.test.tsx components/theme/ThemeToggle.tsx
git commit -m "feat: 좌측 사이드바 내비게이션 컴포넌트 추가, ThemeToggle 아이콘화"
```

---

### Task 3: 홈 페이지 — Sidebar 적용 + 요약 카드 리디자인

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/page.test.tsx`
- Modify: `components/dashboard/GmailSummaryCard.tsx`
- Modify: `components/dashboard/DriveSummaryCard.tsx`
- Modify: `components/dashboard/NotionSummaryCard.tsx`

**Interfaces:**
- Consumes: Task 2의 `Sidebar`
- Produces: 없음 (다른 태스크가 이 파일들을 참조하지 않는다)

홈 페이지에 `Sidebar`를 추가하면 사이드바의 "Gmail"/"Notion" 메뉴 링크가 기존 요약 카드의 "Gmail"/"Notion" 링크와 접근성 이름이 같아져 `app/page.test.tsx`의 `getByRole("link", { name: /Gmail/ })` 같은 정규식 쿼리가 "여러 요소가 일치함" 에러로 깨진다. 요약 카드 영역을 `<section aria-label="서비스 요약">`으로 감싸고 테스트에서 `within()`으로 범위를 좁혀 이 충돌을 해결한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `app/page.test.tsx` 전체 교체**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import HomePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
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

    const summarySection = screen.getByRole("region", { name: "서비스 요약" });
    expect(within(summarySection).getByRole("link", { name: /Gmail/ })).toHaveAttribute(
      "href",
      "/gmail"
    );
    expect(within(summarySection).getByRole("link", { name: /Google Drive/ })).toHaveAttribute(
      "href",
      "/drive"
    );
    expect(within(summarySection).getByRole("link", { name: /Notion/ })).toHaveAttribute(
      "href",
      "/notion"
    );
  });

  it("사이드바에 4개의 메뉴가 표시된다", async () => {
    getGmailSummaryMock.mockResolvedValue({ state: "not_connected" });
    getDriveSummaryMock.mockResolvedValue({ state: "not_connected" });
    getNotionSummaryMock.mockResolvedValue({ state: "not_configured" });

    await renderHomePage();

    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run app/page.test.tsx`
Expected: FAIL — `Sidebar`가 아직 홈 페이지에 없어 "서비스 요약" region과 사이드바 내비게이션을 찾지 못함.

- [ ] **Step 3: `app/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
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
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <section aria-label="서비스 요약" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <GmailSummaryCard summary={gmailSummary} />
          <DriveSummaryCard summary={driveSummary} />
          <NotionSummaryCard summary={notionSummary} />
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: 요약 카드 3종 리디자인**

`components/dashboard/GmailSummaryCard.tsx` 교체:
```tsx
import Link from "next/link";
import { Mail } from "lucide-react";
import type { GmailSummary } from "@/lib/dashboard/homeSummary";

export function GmailSummaryCard({ summary }: { summary: GmailSummary }) {
  return (
    <Link
      href="/gmail"
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Mail className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">Gmail</h2>
      </div>
      {summary.state === "not_connected" ? (
        <p className="mt-3 text-sm text-muted">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-3 text-sm text-muted">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.subjects.length === 0 ? (
        <p className="mt-3 text-sm text-muted">받은 메일이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.subjects.map((subject, index) => (
            <li key={index} className="truncate text-sm text-foreground">
              {subject}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

`components/dashboard/DriveSummaryCard.tsx` 교체:
```tsx
import Link from "next/link";
import { HardDrive } from "lucide-react";
import type { DriveSummary } from "@/lib/dashboard/homeSummary";

export function DriveSummaryCard({ summary }: { summary: DriveSummary }) {
  return (
    <Link
      href="/drive"
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <HardDrive className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">Google Drive</h2>
      </div>
      {summary.state === "not_connected" ? (
        <p className="mt-3 text-sm text-muted">Google 계정 연결이 필요합니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-3 text-sm text-muted">
          연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
        </p>
      ) : summary.names.length === 0 ? (
        <p className="mt-3 text-sm text-muted">파일이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.names.map((name, index) => (
            <li key={index} className="truncate text-sm text-foreground">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

`components/dashboard/NotionSummaryCard.tsx` 교체:
```tsx
import Link from "next/link";
import { NotebookText } from "lucide-react";
import type { NotionSummary } from "@/lib/dashboard/homeSummary";

export function NotionSummaryCard({ summary }: { summary: NotionSummary }) {
  return (
    <Link
      href="/notion"
      className="block rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent/40"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-accent">
          <NotebookText className="h-4 w-4" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold text-foreground">Notion</h2>
      </div>
      {summary.state === "not_configured" ? (
        <p className="mt-3 text-sm text-muted">Notion 연동이 설정되지 않았습니다.</p>
      ) : summary.state === "error" ? (
        <p className="mt-3 text-sm text-muted">NOTION_API_KEY 값을 확인해주세요.</p>
      ) : summary.state === "empty" ? (
        <p className="mt-3 text-sm text-muted">공유된 데이터베이스가 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {summary.titles.map((title, index) => (
            <li key={index} className="truncate text-sm text-foreground">
              {title}
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/page.test.tsx components/dashboard/GmailSummaryCard.test.tsx components/dashboard/DriveSummaryCard.test.tsx components/dashboard/NotionSummaryCard.test.tsx`
Expected: 모두 PASS (`app/page.test.tsx` 3개, 카드별 기존 4개씩 — 카드 테스트 파일은 텍스트/href만 검증하므로 수정 없이 통과해야 함)

- [ ] **Step 6: 커밋**

```bash
git add app/page.tsx app/page.test.tsx components/dashboard/GmailSummaryCard.tsx components/dashboard/DriveSummaryCard.tsx components/dashboard/NotionSummaryCard.tsx
git commit -m "feat: 홈 페이지에 사이드바 적용, 요약 카드에 아이콘·토큰 스타일 적용"
```

---

### Task 4: Gmail 3개 화면 — Sidebar 적용 + 스타일 토큰화

**Files:**
- Modify: `app/gmail/page.tsx`
- Modify: `app/gmail/page.test.tsx`
- Modify: `app/gmail/[id]/page.tsx`
- Modify: `app/gmail/compose/page.tsx`
- Modify: `app/gmail/compose/page.test.tsx`
- Modify: `app/gmail/[id]/TrashButton.tsx`

**Interfaces:**
- Consumes: Task 2의 `Sidebar`
- Produces: 없음

이 태스크는 세 화면 모두 같은 종류의 변경(AppHeader→Sidebar 교체, raw 색상 클래스→토큰 클래스 교체)이라 하나의 태스크로 묶는다. `app/gmail/[id]/page.tsx`는 기존에 전용 테스트 파일이 없으므로(존재 확인됨 — `app/gmail/[id]/TrashButton.test.tsx`만 있음) 새 테스트를 추가하지 않는다.

- [ ] **Step 1: `app/gmail/page.test.tsx`에 `usePathname` 모킹 추가**

파일 상단의 다음 블록:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
```
을 아래로 교체:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/gmail",
}));
```

- [ ] **Step 2: `app/gmail/compose/page.test.tsx`에 `usePathname` 모킹 추가**

파일 상단의 다음 블록:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));
```
을 아래로 교체:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: () => "/gmail/compose",
}));
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run app/gmail/page.test.tsx app/gmail/compose/page.test.tsx`
Expected: FAIL — 아직 페이지가 `Sidebar`를 쓰지 않으므로 `usePathname` 모킹 자체는 영향이 없어야 하지만, 이후 스텝에서 페이지를 교체하면 `AppHeader`가 사라지는 시점에 맞춰 최종 확인한다. (이 스텝은 모킹 추가만으로는 실패하지 않을 수 있다 — 그렇다면 그대로 다음 스텝으로 진행한다.)

- [ ] **Step 4: `app/gmail/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listRecentMessages, type GmailMessageSummary } from "@/lib/google/gmailClient";

export default async function GmailPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string };
}) {
  const connected = await isGoogleConnected();

  let messages: GmailMessageSummary[] = [];
  let loadError = false;

  if (connected) {
    try {
      messages = await listRecentMessages();
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
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {messages.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/gmail/${message.id}`}
                  className="block px-4 py-3 hover:bg-surface-hover"
                >
                  <p className="text-sm font-medium text-foreground">{message.subject}</p>
                  <p className="text-xs text-muted">{message.from}</p>
                  <p className="mt-1 text-xs text-muted">{message.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: `app/gmail/[id]/page.tsx` 교체**

```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getMessageDetail } from "@/lib/google/gmailClient";
import { TrashButton } from "./TrashButton";

export const dynamic = "force-dynamic";

export default async function GmailDetailPage({ params }: { params: { id: string } }) {
  let message;
  try {
    message = await getMessageDetail(params.id);
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <Link href="/gmail" className="text-sm text-muted hover:text-foreground">
            ← 목록으로
          </Link>
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
        </main>
      </div>
    );
  }

  if (!message) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <Link href="/gmail" className="text-sm text-muted hover:text-foreground">
          ← 목록으로
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{message.subject}</h1>
            <p className="mt-1 text-sm text-muted">{message.from}</p>
            <p className="text-xs text-muted">{message.date}</p>
          </div>
          <TrashButton messageId={message.id} />
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 6: `app/gmail/compose/page.tsx` 교체**

```tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
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
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <Link href="/gmail" className="text-sm text-muted hover:text-foreground">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-foreground">새 메일 작성</h1>

        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
          <div className="space-y-1">
            <label htmlFor="to" className="text-sm text-muted">
              받는 사람
            </label>
            <input
              id="to"
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="subject" className="text-sm text-muted">
              제목
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="body" className="text-sm text-muted">
              내용
            </label>
            <textarea
              id="body"
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSending}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSending ? "발송 중..." : "발송"}
          </button>
        </form>
      </main>
    </div>
  );
}
```

- [ ] **Step 7: `app/gmail/[id]/TrashButton.tsx` 토큰화**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trashMessageAction } from "./actions";

export function TrashButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashMessageAction(messageId);
      router.push("/gmail");
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDeleting}
        className="rounded-lg border border-danger px-3 py-1.5 text-sm text-danger hover:bg-danger-bg disabled:opacity-50"
      >
        {isDeleting ? "삭제 중..." : "삭제"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 8: 테스트 통과 확인**

Run: `npx vitest run app/gmail/page.test.tsx app/gmail/compose/page.test.tsx app/gmail/[id]/TrashButton.test.tsx`
Expected: 모두 PASS (기존 테스트 그대로: gmail/page 5개, compose 2개, TrashButton 2개)

- [ ] **Step 9: 커밋**

```bash
git add app/gmail/page.tsx app/gmail/page.test.tsx app/gmail/[id]/page.tsx app/gmail/compose/page.tsx app/gmail/compose/page.test.tsx app/gmail/[id]/TrashButton.tsx
git commit -m "feat: Gmail 3개 화면에 사이드바 적용 및 디자인 토큰 반영"
```

---

### Task 5: Drive 화면 — Sidebar 적용 + 스타일 토큰화

**Files:**
- Modify: `app/drive/page.tsx`
- Modify: `app/drive/page.test.tsx`
- Modify: `app/drive/UploadForm.tsx`
- Modify: `app/drive/FileRowActions.tsx`

**Interfaces:**
- Consumes: Task 2의 `Sidebar`, `lucide-react`의 `Folder`/`FileText`
- Produces: 없음

기존 "← 홈으로" 링크는 `Sidebar`의 "홈" 메뉴와 중복되므로 제거한다 (Global Constraints 참고). `app/drive/page.test.tsx`는 이 링크를 검증하지 않으므로 제거해도 회귀 없음.

- [ ] **Step 1: `app/drive/page.test.tsx`에 `usePathname` 모킹 추가**

파일 상단의 다음 블록:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
```
을 아래로 교체:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/drive",
}));
```

- [ ] **Step 2: `app/drive/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Folder } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listFolder } from "@/lib/google/driveClient";
import { UploadForm } from "./UploadForm";
import { FileRowActions } from "./FileRowActions";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: { folderId?: string };
}) {
  const connected = await isGoogleConnected();

  if (!connected) {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">Google Drive</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 연결
            </a>
          </div>
        </main>
      </div>
    );
  }

  const folderId = searchParams.folderId ?? "root";

  let view;
  try {
    view = await listFolder(folderId);
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 다시 연결
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!view) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">{view.folderName}</h1>
        {view.parentId ? (
          <Link
            href={`/drive?folderId=${view.parentId}`}
            className="mt-1 inline-block text-sm text-muted hover:text-foreground"
          >
            ← 상위 폴더
          </Link>
        ) : null}

        <UploadForm folderId={view.folderId} />

        {view.files.length === 0 ? (
          <p className="mt-6 text-sm text-muted">폴더가 비어 있습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {file.isFolder ? (
                    <Folder className="h-4 w-4 text-muted" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                  )}
                  {file.isFolder ? (
                    <Link
                      href={`/drive?folderId=${file.id}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {file.name}
                      <span className="ml-2 rounded bg-surface-hover px-1.5 py-0.5 text-xs text-muted">
                        폴더
                      </span>
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                  )}
                </div>
                <FileRowActions fileId={file.id} currentName={file.name} isFolder={file.isFolder} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: `app/drive/UploadForm.tsx` 토큰화**

```tsx
"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileAction } from "./actions";

const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

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

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage("파일 크기는 4MB 이하만 업로드할 수 있습니다.");
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
      setErrorMessage("업로드에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="text-sm text-muted"
        aria-label="업로드할 파일"
      />
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isUploading ? "업로드 중..." : "업로드"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}{" "}
          <a href="/api/auth/google/start" className="underline">
            Google 계정 다시 연결
          </a>
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 4: `app/drive/FileRowActions.tsx` 토큰화**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFileAction, trashFileAction } from "./actions";

export function FileRowActions({
  fileId,
  currentName,
  isFolder = false,
}: {
  fileId: string;
  currentName: string;
  isFolder?: boolean;
}) {
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
      setErrorMessage("이름 변경에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      isFolder &&
      !window.confirm(
        `"${currentName}" 폴더를 삭제하면 안의 모든 파일도 함께 삭제됩니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashFileAction(fileId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
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
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSaveRename}
            disabled={isSaving || !newName.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}{" "}
            <a href="/api/auth/google/start" className="underline">
              Google 계정 다시 연결
            </a>
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
          className="rounded-md border border-border px-2 py-1 text-xs text-muted"
        >
          이름변경
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-danger px-2 py-1 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}{" "}
          <a href="/api/auth/google/start" className="underline">
            Google 계정 다시 연결
          </a>
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run app/drive/page.test.tsx app/drive/UploadForm.test.tsx app/drive/FileRowActions.test.tsx`
Expected: 모두 PASS (기존 테스트 그대로: page 5개, UploadForm 3개, FileRowActions 6개)

- [ ] **Step 6: 커밋**

```bash
git add app/drive/page.tsx app/drive/page.test.tsx app/drive/UploadForm.tsx app/drive/FileRowActions.tsx
git commit -m "feat: Drive 화면에 사이드바 적용 및 디자인 토큰 반영"
```

---

### Task 6: Notion 2개 화면 — Sidebar 적용 + 스타일 토큰화

**Files:**
- Modify: `app/notion/page.tsx`
- Modify: `app/notion/page.test.tsx`
- Modify: `app/notion/[id]/page.tsx`
- Modify: `app/notion/[id]/page.test.tsx`
- Modify: `app/notion/CreateItemForm.tsx`
- Modify: `app/notion/ItemRowActions.tsx`

**Interfaces:**
- Consumes: Task 2의 `Sidebar`, `lucide-react`의 `NotebookText`
- Produces: 없음

Drive와 동일하게 "← 홈으로" 링크를 제거한다.

- [ ] **Step 1: `app/notion/page.test.tsx`에 `usePathname` 모킹 추가**

파일 상단의 다음 블록:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
```
을 아래로 교체:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/notion",
}));
```

- [ ] **Step 2: `app/notion/[id]/page.test.tsx`에 `usePathname` 모킹 추가**

파일 상단의 다음 블록:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
```
을 아래로 교체:
```tsx
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/notion/db-1",
}));
```

- [ ] **Step 3: `app/notion/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { NotebookText } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { isNotionConfigured, listSharedDatabases } from "@/lib/notion/notionClient";

export default async function NotionPage() {
  const configured = isNotionConfigured();

  let databases: Awaited<ReturnType<typeof listSharedDatabases>> = [];
  let loadError = false;

  if (configured) {
    try {
      databases = await listSharedDatabases();
    } catch (error) {
      console.error("[notion] listSharedDatabases 실패:", error);
      loadError = true;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">Notion</h1>

        {!configured ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Notion 연동이 설정되지 않았습니다. 관리자가 NOTION_API_KEY 환경변수를
              설정해야 합니다.
            </p>
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        ) : databases.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              공유된 데이터베이스가 없습니다. Notion에서 사용할 데이터베이스를 열고
              이 Integration과 공유해주세요.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {databases.map((database) => (
              <li key={database.id}>
                <Link
                  href={`/notion/${database.id}`}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-surface-hover"
                >
                  <NotebookText className="h-4 w-4 text-muted" aria-hidden="true" />
                  <p className="text-sm font-medium text-foreground">{database.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: `app/notion/[id]/page.tsx` 교체**

```tsx
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { getDatabaseItems } from "@/lib/notion/notionClient";
import { CreateItemForm } from "../CreateItemForm";
import { ItemRowActions } from "../ItemRowActions";

export default async function NotionDatabasePage({ params }: { params: { id: string } }) {
  let view;
  try {
    view = await getDatabaseItems(params.id);
  } catch (error) {
    console.error("[notion] getDatabaseItems 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <Link href="/notion" className="text-sm text-muted hover:text-foreground">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <Link href="/notion" className="text-sm text-muted hover:text-foreground">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              이 데이터베이스를 찾을 수 없습니다. Notion에서 데이터베이스를 열고 우측 상단
              &quot;...&quot; 메뉴 &gt; &quot;연결 추가&quot;에서 이 Integration과 공유했는지
              확인해주세요.
            </p>
            <Link
              href="/notion"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              데이터베이스 목록으로 돌아가기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <Link href="/notion" className="text-sm text-muted hover:text-foreground">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-foreground">{view.databaseTitle}</h1>

        <CreateItemForm databaseId={view.databaseId} titlePropertyName={view.titlePropertyName} />

        {view.items.length === 0 ? (
          <p className="mt-6 text-sm text-muted">항목이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {view.items.map((item) => (
              <li key={item.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <ItemRowActions
                  pageId={item.id}
                  databaseId={view.databaseId}
                  titlePropertyName={view.titlePropertyName}
                  currentTitle={item.title}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 5: `app/notion/CreateItemForm.tsx` 토큰화**

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
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !title.trim()}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "새 항목 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 6: `app/notion/ItemRowActions.tsx` 토큰화**

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
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newTitle.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewTitle(currentTitle);
              setErrorMessage(null);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
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
        className="rounded-md border border-border px-2 py-1 text-xs text-muted"
      >
        이름변경
      </button>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 7: 테스트 통과 확인**

Run: `npx vitest run app/notion/page.test.tsx app/notion/[id]/page.test.tsx app/notion/CreateItemForm.test.tsx app/notion/ItemRowActions.test.tsx`
Expected: 모두 PASS (기존 테스트 그대로: page 4개, [id]/page 4개, CreateItemForm 3개, ItemRowActions 3개)

- [ ] **Step 8: 커밋**

```bash
git add app/notion/page.tsx app/notion/page.test.tsx app/notion/[id]/page.tsx app/notion/[id]/page.test.tsx app/notion/CreateItemForm.tsx app/notion/ItemRowActions.tsx
git commit -m "feat: Notion 2개 화면에 사이드바 적용 및 디자인 토큰 반영"
```

---

### Task 7: 로그인 페이지 + 에러 바운더리 리디자인

**Files:**
- Modify: `app/login/page.tsx`
- Modify: `app/error.tsx`

**Interfaces:**
- Consumes: Task 1의 토큰 클래스, `lucide-react`의 `LayoutDashboard`
- Produces: 없음

이 두 페이지는 인증 경계/에러 경계라 `Sidebar`를 렌더링하지 않는다 — 기존처럼 독립된 중앙 정렬 카드 레이아웃을 유지하되 새 토큰과 브랜드 마크를 적용한다. 텍스트·라벨·역할(role)은 전혀 바꾸지 않으므로 두 페이지 모두 기존 테스트 파일 수정이 필요 없다.

- [ ] **Step 1: `app/login/page.tsx` 교체**

```tsx
"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NOT_ADMIN_MESSAGE = "관리자 권한이 없는 계정입니다.";

// useSearchParams는 Suspense 경계 안에서만 사용할 수 있어 폼을 분리한다.
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-bg" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams?.get("error") === "not_admin" ? NOT_ADMIN_MESSAGE : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    // 로그인에 성공해 화면이 전환되는 경우에는 버튼을 다시 활성화하지 않는다.
    let isNavigating = false;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage(
          error.message?.toLowerCase().includes("email not confirmed")
            ? "이메일이 아직 인증되지 않았습니다. 이메일함을 확인해주세요."
            : "이메일 또는 비밀번호가 올바르지 않습니다."
        );
        return;
      }

      router.push("/");
      router.refresh();
      isNavigating = true;
    } catch {
      setErrorMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      if (!isNavigating) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-accent">
            <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-base font-semibold text-foreground">개인 업무 대시보드</span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <h1 className="text-xl font-semibold text-foreground">관리자 로그인</h1>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm text-muted">
              이메일
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm text-muted">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-accent py-2 font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: `app/error.tsx` 교체**

```tsx
"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-6">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center">
        <h1 className="text-base font-semibold text-foreground">문제가 발생했습니다.</h1>
        <p className="mt-2 text-sm text-muted">
          일시적인 오류일 수 있습니다. 다시 시도해주세요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover"
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: 테스트 통과 확인**

Run: `npx vitest run app/login/page.test.tsx app/error.test.tsx`
Expected: 모두 PASS (기존 테스트 그대로: login 5개, error 2개 — 텍스트/역할을 바꾸지 않았으므로 수정 없이 통과해야 함)

- [ ] **Step 4: 커밋**

```bash
git add app/login/page.tsx app/error.tsx
git commit -m "feat: 로그인 페이지와 에러 바운더리에 브랜드 카드 스타일 적용"
```

---

### Task 8: AppHeader 삭제 + 전체 최종 검증

**Files:**
- Delete: `components/layout/AppHeader.tsx`
- Delete: `components/layout/AppHeader.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음 (Task 3~7 완료 후 `AppHeader`를 참조하는 페이지가 더 이상 없음)
- Produces: 없음 (이 계획의 마지막 태스크)

- [ ] **Step 1: 남은 `AppHeader` 참조가 없는지 확인**

Run: `grep -rn "AppHeader" app components --include="*.tsx"`
Expected: 결과 없음 (Task 3~7에서 모든 페이지가 `Sidebar`로 교체되었으므로). 만약 결과가 있다면 그 파일을 먼저 `Sidebar`로 교체한 뒤 이 태스크를 진행한다.

- [ ] **Step 2: `AppHeader` 삭제**

```bash
rm components/layout/AppHeader.tsx components/layout/AppHeader.test.tsx
```

- [ ] **Step 3: 남은 raw 색상 클래스가 없는지 확인**

Run: `grep -rn "bg-neutral-\|bg-blue-600\|text-red-400\|border-red-800\|text-green-400\|border-green-800\|bg-green-950\|bg-red-950" app components --include="*.tsx"`
Expected: 결과 없음. 만약 결과가 있다면 해당 파일에 남아있는 raw 클래스를 이 계획의 토큰 클래스로 교체한다.

- [ ] **Step 4: README 진행 현황에 리디자인 완료 표시**

`README.md`의 "## 진행 현황" 섹션을 아래로 교체:
```markdown
## 진행 현황

- [x] 1단계: 기반 구축 (인증, 다크모드, 빈 라우트)
- [x] 2단계: Gmail 연동
- [x] 3단계: Google Drive 연동
- [x] 4단계: Notion 연동
- [x] 5단계: 홈 화면 통합
- [x] UI 리디자인: 색상 토큰(다크/라이트), 사이드바 내비게이션, 아이콘, 타이포그래피
```

- [ ] **Step 5: 전체 테스트 및 빌드로 최종 검증**

Run: `npm test`
Expected: 33개 파일, 168개 테스트 모두 PASS (기존 165개 − `AppHeader.test.tsx` 2개 + `Sidebar.test.tsx` 4개 + 홈 페이지 신규 테스트 1개 = 168개, 회귀 없음)

Run: `npm run build`
Expected: 빌드 성공.

- [ ] **Step 6: 커밋**

```bash
git add -A components/layout/AppHeader.tsx components/layout/AppHeader.test.tsx README.md
git commit -m "chore: 이제 쓰이지 않는 AppHeader 삭제, UI 리디자인 완료 표시"
```
