"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { trashMessageAction } from "./actions";

export function TrashButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    setIsDeleting(true);
    await trashMessageAction(messageId);
    router.push("/gmail");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDeleting}
      className="rounded-md border border-red-800 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
    >
      {isDeleting ? "삭제 중..." : "삭제"}
    </button>
  );
}
