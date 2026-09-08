export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Folder } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listFolder } from "@/lib/google/driveClient";
import { UploadForm } from "./UploadForm";
import { FileRowActions } from "./FileRowActions";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: { folderId?: string };
}) {
  const connected = await isGoogleConnected();

  if (!connected) {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <h1 className="text-lg font-semibold text-foreground">Google Drive</h1>
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 연결
            </a>
          </div>
        </main>
      </div>
    );
  }

  const folderId = searchParams.folderId ?? "root";

  let view;
  try {
    view = await listFolder(folderId);
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 다시 연결
            </a>
          </div>
        </main>
      </div>
    );
  }

  if (!view) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <h1 className="text-lg font-semibold text-foreground">{view.folderName}</h1>
        {view.parentId ? (
          <Link
            href={`/drive?folderId=${view.parentId}`}
            className="mt-1 inline-block text-sm text-muted hover:text-foreground"
          >
            ← 상위 폴더
          </Link>
        ) : null}

        <UploadForm folderId={view.folderId} />

        {view.files.length === 0 ? (
          <p className="mt-6 text-sm text-muted">폴더가 비어 있습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  {file.isFolder ? (
                    <Folder className="h-4 w-4 text-muted" aria-hidden="true" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted" aria-hidden="true" />
                  )}
                  {file.isFolder ? (
                    <Link
                      href={`/drive?folderId=${file.id}`}
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {file.name}
                      <span className="ml-2 rounded bg-surface-hover px-1.5 py-0.5 text-xs text-muted">
                        폴더
                      </span>
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                  )}
                </div>
                <FileRowActions fileId={file.id} currentName={file.name} isFolder={file.isFolder} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
