export const dynamic = "force-dynamic";

import { Sidebar } from "@/components/layout/Sidebar";
import { listCategoriesWithAccounts, type CategoryWithAccounts } from "@/lib/accounts/accountsStore";
import { CreateCategoryForm } from "./CreateCategoryForm";
import { AccountsBoard } from "./AccountsBoard";

export default async function AccountsPage() {
  let categories: CategoryWithAccounts[];

  try {
    categories = await listCategoriesWithAccounts();
  } catch (error) {
    console.error("[accounts] listCategoriesWithAccounts 실패:", error);
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">계정관리</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              계정 정보를 불러오지 못했습니다. Supabase 연결 상태와
              0003_accounts.sql 마이그레이션 실행 여부를 확인해주세요.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">계정관리</h1>

        <CreateCategoryForm />

        {categories.length === 0 ? (
          <p className="mt-6 text-sm text-muted">카테고리를 먼저 만들어주세요.</p>
        ) : (
          <AccountsBoard categories={categories} />
        )}
      </main>
    </div>
  );
}
