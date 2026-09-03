"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createAccountAction } from "./actions";

export function CreateAccountForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [memo, setMemo] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setCategoryId(categories[0]?.id ?? "");
    setName("");
    setUrl("");
    setUsername("");
    setPassword("");
    setMemo("");
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!categoryId || !name.trim() || !username.trim() || !password.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createAccountAction({ categoryId, name, url, username, password, memo });
      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "계정 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mt-4 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
      >
        + 새 계정 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 md:max-w-md"
    >
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        aria-label="분류"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="계정명"
        aria-label="계정명"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        aria-label="URL"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        placeholder="아이디"
        aria-label="아이디"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        type="text"
        aria-label="비밀번호"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 (선택)"
        aria-label="메모"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isCreating || !categoryId || !name.trim() || !username.trim() || !password.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isCreating ? "추가 중..." : "등록"}
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
        >
          취소
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
