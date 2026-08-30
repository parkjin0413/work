"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFileAction, trashFileAction } from "./actions";

export function FileRowActions({
  fileId,
  currentName,
  isFolder = false,
}: {
  fileId: string;
  currentName: string;
  isFolder?: boolean;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSaveRename() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameFileAction(fileId, newName);
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      isFolder &&
      !window.confirm(
        `"${currentName}" 폴더를 삭제하면 안의 모든 파일도 함께 삭제됩니다. 계속하시겠습니까?`
      )
    ) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashFileAction(fileId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="새 이름"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-50"
          />
          <button
            type="button"
            onClick={handleSaveRename}
            disabled={isSaving || !newName.trim()}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
            }}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-red-400">
            {errorMessage}{" "}
            <a href="/api/auth/google/start" className="underline">
              Google 계정 다시 연결
            </a>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsRenaming(true)}
          className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
        >
          이름변경
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-red-800 px-2 py-1 text-xs text-red-400 disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}{" "}
          <a href="/api/auth/google/start" className="underline">
            Google 계정 다시 연결
          </a>
        </p>
      ) : null}
    </div>
  );
}
