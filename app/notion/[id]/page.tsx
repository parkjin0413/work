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
