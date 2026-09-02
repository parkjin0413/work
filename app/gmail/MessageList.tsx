"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { GmailMessageSummary } from "@/lib/google/gmailClient";
import { trashMessagesAction } from "./actions";

export function MessageList({ messages }: { messages: GmailMessageSummary[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const allSelected =
    messages.length > 0 && messages.every((message) => selectedIds.includes(message.id));

  function toggleAll() {
    setSelectedIds(allSelected ? [] : messages.map((message) => message.id));
  }

  function toggleOne(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id]
    );
  }

  async function handleDeleteSelected() {
    if (!window.confirm(`${selectedIds.length}개의 메일을 휴지통으로 이동하시겠습니까?`)) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashMessagesAction(selectedIds);
      setSelectedIds([]);
      router.refresh();
    } catch {
      setErrorMessage("일부 메일 삭제에 실패했습니다. 목록을 새로고침해서 확인해주세요.");
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-border bg-surface px-4 py-3">
        <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="전체 선택" />
        <span className="text-sm text-muted">{selectedIds.length}개 선택됨</span>
        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={selectedIds.length === 0 || isDeleting}
          className="ml-auto rounded-lg border border-danger px-3 py-1.5 text-xs text-danger disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "선택 삭제"}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="border-x border-border bg-surface px-4 py-2 text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
      <ul className="divide-y divide-border rounded-b-2xl border border-border bg-surface">
        {messages.map((message) => (
          <li key={message.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={selectedIds.includes(message.id)}
              onChange={() => toggleOne(message.id)}
              aria-label={`${message.subject} 선택`}
            />
            <Link
              href={`/gmail/${message.id}`}
              className="min-w-0 flex-1 hover:underline"
            >
              <p className="truncate text-sm font-medium text-foreground">{message.subject}</p>
              <p className="truncate text-xs text-muted">{message.from}</p>
              <p className="mt-1 truncate text-xs text-muted">{message.snippet}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
