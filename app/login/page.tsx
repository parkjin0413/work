"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const NOT_ADMIN_MESSAGE = "관리자 권한이 없는 계정입니다.";

// useSearchParams는 Suspense 경계 안에서만 사용할 수 있어 폼을 분리한다.
export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-neutral-950" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams?.get("error") === "not_admin" ? NOT_ADMIN_MESSAGE : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    // 로그인에 성공해 화면이 전환되는 경우에는 버튼을 다시 활성화하지 않는다.
    let isNavigating = false;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setErrorMessage(
          error.message?.toLowerCase().includes("email not confirmed")
            ? "이메일이 아직 인증되지 않았습니다. 이메일함을 확인해주세요."
            : "이메일 또는 비밀번호가 올바르지 않습니다."
        );
        return;
      }

      router.push("/");
      router.refresh();
      isNavigating = true;
    } catch {
      setErrorMessage("일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      if (!isNavigating) {
        setIsSubmitting(false);
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-neutral-800 bg-neutral-900 p-8"
      >
        <h1 className="text-xl font-semibold text-neutral-50">관리자 로그인</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-neutral-300">
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-50"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-neutral-300">
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-neutral-50"
          />
        </div>

        {errorMessage ? (
          <p role="alert" className="text-sm text-red-400">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-blue-600 py-2 font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? "로그인 중..." : "로그인"}
        </button>
      </form>
    </main>
  );
}
