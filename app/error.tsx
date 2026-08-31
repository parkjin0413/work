"use client";

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-6 text-center">
        <h1 className="text-base font-semibold text-neutral-50">문제가 발생했습니다.</h1>
        <p className="mt-2 text-sm text-neutral-400">
          일시적인 오류일 수 있습니다. 다시 시도해주세요.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={reset}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-200"
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
