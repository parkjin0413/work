"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { renameDepartmentAction, deleteDepartmentAction } from "./actions";

export function DepartmentRowActions({
  departmentId,
  currentName,
}: {
  departmentId: string;
  currentName: string;
}) {
  const router = useRouter();
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentName);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      await renameDepartmentAction(departmentId, newName);
      setIsRenaming(false);
      router.refresh();
    } catch {
      setErrorMessage("이름 변경에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(`"${currentName}" 부서를 삭제하면 안의 직원 정보도 함께 삭제됩니다. 계속하시겠습니까?`)
    ) {
      return;
    }

    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deleteDepartmentAction(departmentId);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
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
            aria-label="새 부서 이름"
            className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !newName.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRenaming(false);
              setNewName(currentName);
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
          aria-label={`${currentName} 부서 이름변경`}
          className="rounded-md border border-border px-2 py-1 text-xs text-muted"
        >
          이름변경
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label={`${currentName} 부서 삭제`}
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
