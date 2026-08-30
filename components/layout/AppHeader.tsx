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
