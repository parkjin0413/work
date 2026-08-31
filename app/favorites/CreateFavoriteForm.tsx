"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createFavoriteAction } from "./actions";

export function CreateFavoriteForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !url.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createFavoriteAction({ categoryId, name, url });
      setName("");
      setUrl("");
      router.refresh();
    } catch {
      setErrorMessage("올바른 URL 형식이 아닙니다 (http:// 또는 https://로 시작해야 합니다)");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        aria-label="새 즐겨찾기 이름"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        aria-label="새 즐겨찾기 URL"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !name.trim() || !url.trim()}
        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "즐겨찾기 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
