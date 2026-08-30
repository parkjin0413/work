export const dynamic = "force-dynamic";

import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { isNotionConfigured, listSharedDatabases } from "@/lib/notion/notionClient";

export default async function NotionPage() {
  const configured = isNotionConfigured();

  let databases: Awaited<ReturnType<typeof listSharedDatabases>> = [];
  let loadError = false;

  if (configured) {
    try {
      databases = await listSharedDatabases();
    } catch {
      loadError = true;
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">Notion</h1>

        {!configured ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동이 설정되지 않았습니다. 관리자가 NOTION_API_KEY 환경변수를
              설정해야 합니다.
            </p>
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Notion 연동에 문제가 발생했습니다. NOTION_API_KEY 값을 확인해주세요.
            </p>
          </div>
        ) : databases.length === 0 ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              공유된 데이터베이스가 없습니다. Notion에서 사용할 데이터베이스를 열고
              이 Integration과 공유해주세요.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {databases.map((database) => (
              <li key={database.id}>
                <Link
                  href={`/notion/${database.id}`}
                  className="block px-4 py-3 hover:bg-neutral-800"
                >
                  <p className="text-sm font-medium text-neutral-50">{database.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
