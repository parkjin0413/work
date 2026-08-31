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
