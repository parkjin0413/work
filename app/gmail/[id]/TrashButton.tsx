"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trashMessageAction } from "./actions";

export function TrashButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleClick() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await trashMessageAction(messageId);
      router.push("/gmail");
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDeleting}
        className="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
      >
        {isDeleting ? "삭제 중..." : "삭제"}
      </button>
      {errorMessage ? (
        <p role="alert" className="text-xs text-red-400">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
