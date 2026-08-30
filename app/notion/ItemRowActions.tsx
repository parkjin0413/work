"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameItemAction } from "./actions";

export function ItemRowActions({
  pageId,
  databaseId,
  titlePropertyName,
  currentTitle,
}: {
  pageId: string;
  databaseId: string;
  titlePropertyName: string;
  currentTitle: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(currentTitle);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameItemAction({ pageId, databaseId, titlePropertyName, newTitle });
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다. NOTION_API_KEY 값을 확인해주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isRenaming) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            aria-label="새 제목"
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm text-neutral-50"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newTitle.trim()}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewTitle(currentTitle);
              setErrorMessage(null);
            }}
            className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-red-400">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => setIsRenaming(true)}
        className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300"
      >
        이름변경
      </button>
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
