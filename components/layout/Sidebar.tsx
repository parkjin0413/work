"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, CheckSquare, FileText, Globe, KeyRound, LogOut, Package } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2 rounded-lg px-1.5 py-2 text-sm font-medium transition-colors sm:px-2 lg:px-3 ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                <Icon className="h-[0.9rem] w-[0.9rem]" aria-hidden="true" />
                <span className="hidden whitespace-nowrap lg:inline">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        onClick={handleLogout}
        aria-label="로그아웃"
        className="flex shrink-0 items-center gap-2 justify-self-end rounded-lg border border-border px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
        <span className="hidden lg:inline">로그아웃</span>
      </button>
    </nav>
  );
}
