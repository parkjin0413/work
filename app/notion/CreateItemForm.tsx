"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createItemAction } from "./actions";

export function CreateItemForm({
  databaseId,
  titlePropertyName,
}: {
  databaseId: string;
  titlePropertyName: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createItemAction({ databaseId, titlePropertyName, title });
      setTitle("");
      router.refresh();
    } catch {
      setErrorMessage("항목 추가에 실패했습니다. NOTION_API_KEY 값을 확인해주세요.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="새 항목 제목"
        aria-label="새 항목 제목"
        className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm text-neutral-50"
      />
      <button
        type="submit"
        disabled={isCreating || !title.trim()}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "새 항목 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
