export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { isGoogleConnected, listFolder } from "@/lib/google/driveClient";
import { UploadForm } from "./UploadForm";

export default async function DrivePage({
  searchParams,
}: {
  searchParams: { folderId?: string };
}) {
  const connected = await isGoogleConnected();

  if (!connected) {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <h1 className="mt-4 text-lg font-semibold text-neutral-50">Google Drive</h1>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 연결
            </a>
          </div>
        </div>
      </main>
    );
  }

  const folderId = searchParams.folderId ?? "root";

  let view;
  try {
    view = await listFolder(folderId);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 홈으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 다시 연결
            </a>
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
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">{view.folderName}</h1>
        {view.parentId ? (
          <Link
            href={`/drive?folderId=${view.parentId}`}
            className="mt-1 inline-block text-sm text-neutral-400 hover:text-neutral-200"
          >
            ← 상위 폴더
          </Link>
        ) : null}

        <UploadForm folderId={view.folderId} />

        {view.files.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">폴더가 비어 있습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {view.files.map((file) => (
              <li key={file.id} className="flex items-center justify-between px-4 py-3">
                {file.isFolder ? (
                  <Link
                    href={`/drive?folderId=${file.id}`}
                    className="text-sm font-medium text-neutral-50 hover:underline"
                  >
                    {file.name}
                    <span className="ml-2 rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">
                      폴더
                    </span>
                  </Link>
                ) : (
                  <p className="text-sm font-medium text-neutral-50">{file.name}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
