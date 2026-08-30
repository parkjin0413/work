"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { uploadFileAction } from "./actions";

const MAX_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024;

export function UploadForm({ folderId }: { folderId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setErrorMessage("파일 크기는 4MB 이하만 업로드할 수 있습니다.");
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folderId", folderId);

    try {
      await uploadFileAction(formData);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      router.refresh();
    } catch {
      setErrorMessage("업로드에 실패했습니다. Google 연결이 만료되었을 수 있습니다.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        className="text-sm text-neutral-300"
        aria-label="업로드할 파일"
      />
      <button
        type="submit"
        disabled={isUploading}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {isUploading ? "업로드 중..." : "업로드"}
      </button>
      {errorMessage ? (
        <p role="alert" className="w-full text-xs text-red-400">
          {errorMessage}{" "}
          <a href="/api/auth/google/start" className="underline">
            Google 계정 다시 연결
          </a>
        </p>
      ) : null}
    </form>
  );
}
