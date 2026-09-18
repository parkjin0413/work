"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CheckSquare, KeyRound, LogOut, Package, Star, Users } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

// 별도 홈 대시보드 없음 — 업무관리가 사실상 기본 화면(첫 메뉴)이라 "/" 항목은 두지 않는다.
const NAV_ITEMS = [
  { href: "/tasks", label: "업무관리", icon: CheckSquare },
  { href: "/accounts", label: "계정관리", icon: KeyRound },
  { href: "/favorites", label: "즐겨찾기", icon: Star },
  { href: "/products", label: "제품정보", icon: Package },
  { href: "/partners", label: "회사정보", icon: Building2 },
  { href: "/employees", label: "직원명단", icon: Users },
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
      className="flex shrink-0 flex-row items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3 md:h-screen md:w-60 md:flex-col md:items-stretch md:justify-start md:border-b-0 md:border-r md:px-4 md:py-6 md:sticky md:top-0"
    >
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-base font-semibold text-foreground">개인 업무 대시보드</span>
      </div>

      <ul className="flex flex-1 flex-row flex-wrap items-center justify-center gap-x-0.5 gap-y-1 md:mt-8 md:flex-1 md:flex-nowrap md:flex-col md:items-stretch md:justify-start md:gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname?.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-label={label}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center justify-center gap-3 rounded-lg px-2 py-2 text-sm font-medium md:justify-start md:px-3 ${
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
