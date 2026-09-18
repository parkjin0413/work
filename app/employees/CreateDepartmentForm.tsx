"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createDepartmentAction } from "./actions";

export function CreateDepartmentForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createDepartmentAction(name);
      setName("");
      router.refresh();
    } catch {
      setErrorMessage("부서 생성에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="새 부서 이름"
        aria-label="새 부서 이름"
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isCreating || !name.trim()}
        className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent disabled:opacity-50"
      >
        {isCreating ? "추가 중..." : "+ 새 부서 추가"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
