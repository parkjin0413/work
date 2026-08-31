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
