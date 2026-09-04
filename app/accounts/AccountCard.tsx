"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, GripVertical, Pencil, Trash2 } from "lucide-react";
import type { AccountSummary } from "@/lib/accounts/accountsStore";
import type { DragHandleProps } from "./AccountsBoard";
import { renameAccountAction, deleteAccountAction } from "./actions";

const MASKED_PASSWORD = "•".repeat(10);

export function AccountCard({
  account,
  categoryId,
  categories,
  dragHandleProps,
}: {
  account: AccountSummary;
  categoryId: string;
  categories: { id: string; name: string }[];
  dragHandleProps?: DragHandleProps;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editCategoryId, setEditCategoryId] = useState(categoryId);
  const [editName, setEditName] = useState(account.name);
  const [editUrl, setEditUrl] = useState(account.url);
  const [editUsername, setEditUsername] = useState(account.username);
  const [editPassword, setEditPassword] = useState(account.password);
  const [editMemo, setEditMemo] = useState(account.memo ?? "");

  const [revealed, setRevealed] = useState(false);
  const [flashRevealed, setFlashRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<"username" | "password" | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copyToClipboard(text: string, field: "username" | "password") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }

    setCopiedField(field);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedField(null), 1500);
  }

  function handleUsernameClick() {
    void copyToClipboard(account.username, "username");
  }

  function handlePasswordClick() {
    void copyToClipboard(account.password, "password");
    if (!revealed) {
      setFlashRevealed(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashRevealed(false), 1500);
    }
  }

  function resetEditFields() {
    setEditCategoryId(categoryId);
    setEditName(account.name);
    setEditUrl(account.url);
    setEditUsername(account.username);
    setEditPassword(account.password);
    setEditMemo(account.memo ?? "");
    setErrorMessage(null);
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameAccountAction({
        id: account.id,
        categoryId: editCategoryId,
        name: editName,
        url: editUrl,
        username: editUsername,
        password: editPassword,
        memo: editMemo,
      });
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteAccountAction(account.id);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface p-4">
        <select
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
          aria-label="분류"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          aria-label="계정명"
          placeholder="계정명"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editUrl}
          onChange={(e) => setEditUrl(e.target.value)}
          aria-label="URL"
          placeholder="https://..."
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editUsername}
          onChange={(e) => setEditUsername(e.target.value)}
          aria-label="아이디"
          placeholder="아이디"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editPassword}
          onChange={(e) => setEditPassword(e.target.value)}
          aria-label="비밀번호"
          placeholder="비밀번호"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editMemo}
          onChange={(e) => setEditMemo(e.target.value)}
          aria-label="메모"
          placeholder="메모 (선택)"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editName.trim() || !editUsername.trim() || !editPassword.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetEditFields();
              setIsEditing(false);
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

  const isPasswordVisible = revealed || flashRevealed;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              aria-label={`${account.name} 순서 변경`}
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical size={14} />
            </button>
          ) : null}
          <h3 className="min-w-0 truncate text-base font-semibold text-foreground">{account.name}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${account.name} 수정`}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`${account.name} 삭제`}
            className="rounded-md p-1.5 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {account.url ? (
        <a
          href={account.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm text-accent hover:underline"
        >
          {account.url}
        </a>
      ) : null}

      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">아이디</span>
        <button
          type="button"
          onClick={handleUsernameClick}
          title="클릭하여 복사"
          className="truncate rounded px-1 text-right font-medium text-foreground hover:bg-bg"
        >
          {account.username}
        </button>
      </div>
      {copiedField === "username" ? (
        <p role="status" className="text-right text-xs text-accent">
          복사되었습니다
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted">비밀번호</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePasswordClick}
            title="클릭하여 복사"
            className="truncate rounded px-1 text-right font-medium text-foreground hover:bg-bg"
          >
            {isPasswordVisible ? account.password : MASKED_PASSWORD}
          </button>
          <button
            type="button"
            onClick={() => setRevealed((prev) => !prev)}
            aria-label={revealed ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={revealed}
            className="rounded-md p-1 text-muted hover:bg-bg hover:text-foreground"
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>
      {copiedField === "password" ? (
        <p role="status" className="text-right text-xs text-accent">
          복사되었습니다
        </p>
      ) : null}

      {account.memo ? <p className="mt-1 text-xs text-muted">{account.memo}</p> : null}
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
