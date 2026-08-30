import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { isGoogleConnected, listRecentMessages } from "@/lib/google/gmailClient";

export default async function GmailPage() {
  const connected = await isGoogleConnected();
  const messages = connected ? await listRecentMessages() : [];

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <div className="mt-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-neutral-50">Gmail</h1>
          {connected ? (
            <Link
              href="/gmail/compose"
              className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              새 메일 작성
            </Link>
          ) : null}
        </div>

        {!connected ? (
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 연결
            </a>
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">받은 메일이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {messages.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/gmail/${message.id}`}
                  className="block px-4 py-3 hover:bg-neutral-800"
                >
                  <p className="text-sm font-medium text-neutral-50">{message.subject}</p>
                  <p className="text-xs text-neutral-400">{message.from}</p>
                  <p className="mt-1 text-xs text-neutral-500">{message.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
