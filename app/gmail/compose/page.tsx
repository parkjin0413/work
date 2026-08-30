"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { sendEmailAction } from "./actions";

export default function ComposePage() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSending(true);

    try {
      await sendEmailAction({ to, subject, body });
      router.push("/gmail");
      router.refresh();
    } catch {
      setErrorMessage("메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setIsSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/gmail" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">새 메일 작성</h1>

        <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-4">
          <div className="space-y-1">
            <label htmlFor="to" className="text-sm text-neutral-300">
              받는 사람
            </label>
            <input
              id="to"
              type="email"
              required
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="subject" className="text-sm text-neutral-300">
              제목
            </label>
            <input
              id="subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="body" className="text-sm text-neutral-300">
              내용
            </label>
            <textarea
              id="body"
              required
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-50"
            />
          </div>

          {errorMessage ? (
            <p role="alert" className="text-sm text-red-400">
              {errorMessage}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isSending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isSending ? "발송 중..." : "발송"}
          </button>
        </form>
      </div>
    </main>
  );
}
