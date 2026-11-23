"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  CheckSquare,
  FileText,
  Globe,
  KeyRound,
  LogOut,
  Moon,
  Package,
  Search,
  Sun,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getNavAlertsAction } from "@/app/navActions";
import { CommandPalette } from "./CommandPalette";

/** 웹 만료 알림 건수: 페이지를 옮길 때마다 묻지 않게 10분 동안 이 탭에 기억한다 */
const ALERT_CACHE_KEY = "nav-alerts";
const ALERT_CACHE_MS = 10 * 60 * 1000;

function useHostingAlerts(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    try {
      const cached = JSON.parse(sessionStorage.getItem(ALERT_CACHE_KEY) ?? "null") as { at: number; hosting: number } | null;
      if (cached && Date.now() - cached.at < ALERT_CACHE_MS) {
        setCount(cached.hosting);
        return;
      }
    } catch {}
    getNavAlertsAction()
      .then(({ hosting }) => {
        if (cancelled) return;
        setCount(hosting);
        try {
          sessionStorage.setItem(ALERT_CACHE_KEY, JSON.stringify({ at: Date.now(), hosting }));
        } catch {}
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return count;
}

/** 밝은/어두운 화면 전환. 처음 값은 layout 의 스크립트가 <html class="dark"> 로 이미 정해 둔다. */
function useTheme(): [boolean, () => void] {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }
  return [dark, toggle];
}

// 별도 홈 대시보드 없음 — 업무관리가 사실상 기본 화면(첫 메뉴)이라 "/" 항목은 두지 않는다.
const NAV_ITEMS = [
  { href: "/tasks", label: "업무", icon: CheckSquare },
  { href: "/calendar", label: "일정", icon: CalendarDays },
  { href: "/forms", label: "양식", icon: FileText },
  { href: "/sites", label: "어카운트", icon: KeyRound },
  { href: "/company", label: "회사", icon: Building2 },
  { href: "/hosting", label: "웹", icon: Globe },
  { href: "/products", label: "제품", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const hostingAlerts = useHostingAlerts();
  const [dark, toggleTheme] = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K / ⌘K: 어디서든 통합 검색 (입력 중이어도 연다)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.code === "KeyK") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function handleLogout() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // 상단 가로 메뉴: 스크롤해도 위에 붙어 있다. 왼쪽 로고·제목을 누르면 업무관리로 간다.
  return (
    <nav
      aria-label="주요 메뉴"
      className="sticky top-0 z-30 print:hidden grid h-14 w-full shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-3 border-b border-border bg-surface px-4 sm:px-8 lg:px-12 2xl:px-[max(4rem,calc((100%-106.6667rem)/2))] shadow-[0_1px_2px_rgba(16,24,40,0.04)] lg:grid-cols-[1fr_auto_1fr] lg:gap-6"
    >
      <Link
        href="/tasks"
        aria-label="강산이엔지 업무 대시보드 (업무로 이동)"
        className="hidden shrink-0 items-center gap-2 justify-self-start rounded-lg pr-1 hover:opacity-80 sm:flex"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- 작은 고정 로고라 next/image 최적화가 필요 없다 */}
        <img src="/logo.png" alt="" width={28} height={28} className="h-7 w-7 rounded-md" />
        <span className="hidden whitespace-nowrap text-base font-semibold text-foreground xl:inline">
          강산이엔지 업무 대시보드
        </span>
      </Link>

      {/* 메뉴는 로고와 로그아웃 사이 정중앙. 휴대폰에서는 로고를 빼고 아이콘을 고르게 펼친다 */}
      <ul className="flex min-w-0 items-center justify-between gap-0 overflow-x-auto sm:justify-center sm:gap-0.5 md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          const alert = href === "/hosting" ? hostingAlerts : 0;
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-label={alert ? `${label} (만료 임박 ${alert}건)` : label}
                aria-current={isActive ? "page" : undefined}
                title={alert ? `만료됐거나 30일 안에 만료되는 항목 ${alert}건` : undefined}
                className={`relative flex items-center gap-2 rounded-lg px-1.5 py-2 text-sm font-medium transition-colors sm:px-2 lg:px-3 ${
                  isActive
                    ? "bg-foreground text-surface"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-[0.9rem] w-[0.9rem]" aria-hidden="true" />
                <span className="hidden whitespace-nowrap lg:inline">{label}</span>
                {alert ? (
                  <span
                    aria-hidden="true"
                    className="absolute right-0.5 top-1 h-[0.42rem] w-[0.42rem] rounded-full bg-danger ring-2 ring-surface lg:right-1"
                  />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex shrink-0 items-center gap-0.5 justify-self-end sm:gap-1">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          aria-label="통합 검색 (Ctrl+K)"
          title="통합 검색 (Ctrl+K)"
          className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-sm text-muted hover:bg-surface-hover hover:text-foreground sm:px-2 xl:border xl:border-border xl:pr-1.5"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span className="hidden xl:inline">검색</span>
          <kbd className="hidden rounded border border-border bg-bg px-1 font-sans text-[0.6rem] text-muted xl:inline">Ctrl K</kbd>
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? "밝은 화면으로" : "어두운 화면으로"}
          title={dark ? "밝은 화면으로" : "어두운 화면으로"}
          className="rounded-lg px-1.5 py-1.5 text-muted hover:bg-surface-hover hover:text-foreground sm:px-2"
        >
          {dark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="로그아웃"
          className="flex items-center gap-2 rounded-lg border border-border px-2 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover sm:px-2.5"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden lg:inline">로그아웃</span>
        </button>
      </div>
      <CommandPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        menus={NAV_ITEMS.map(({ href, label }) => ({ href, label }))}
      />
    </nav>
  );
}
