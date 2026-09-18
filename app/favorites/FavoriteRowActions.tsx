"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameFavoriteAction, deleteFavoriteAction } from "./actions";

export function FavoriteRowActions({
  favoriteId,
  currentName,
  currentUrl,
}: {
  favoriteId: string;
  currentName: string;
  currentUrl: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [newUrl, setNewUrl] = useState(currentUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameFavoriteAction({ id: favoriteId, name: newName, url: newUrl });
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteFavoriteAction(favoriteId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex min-w-0 flex-col items-end gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="새 이름"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <input
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            aria-label="새 URL"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newName.trim() || !newUrl.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
              setNewUrl(currentUrl);
              setErrorMessage(null);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
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
          className="rounded-md border border-border px-2 py-1 text-xs text-muted"
        >
          수정
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-danger px-2 py-1 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
