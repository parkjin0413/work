export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getDatabaseItems } from "@/lib/notion/notionClient";
import { CreateItemForm } from "../CreateItemForm";

export default async function NotionDatabasePage({ params }: { params: { id: string } }) {
  let view;
  try {
    view = await getDatabaseItems(params.id);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!view) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/notion" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.databaseTitle}</h1>

        <CreateItemForm databaseId={view.databaseId} titlePropertyName={view.titlePropertyName} />

        {view.items.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">항목이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.items.map((item) => (
              <li key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-neutral-50">{item.title}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
