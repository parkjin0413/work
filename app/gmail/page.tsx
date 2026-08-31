export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listRecentMessages, type GmailMessageSummary } from "@/lib/google/gmailClient";

export default async function GmailPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string };
}) {
  const connected = await isGoogleConnected();

  let messages: GmailMessageSummary[] = [];
  let loadError = false;

  if (connected) {
    try {
      messages = await listRecentMessages();
    } catch {
      loadError = true;
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-foreground">Gmail</h1>
          {connected && !loadError ? (
            <Link
              href="/gmail/compose"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              새 메일 작성
            </Link>
          ) : null}
        </div>

        {searchParams.connected === "1" ? (
          <p className="mt-4 rounded-md border border-success bg-success-bg px-4 py-2 text-sm text-success">
            Google 계정이 연결되었습니다.
          </p>
        ) : null}
        {searchParams.error === "missing_code" || searchParams.error === "access_denied" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결이 취소되었습니다. 다시 시도해주세요.
          </p>
        ) : null}
        {searchParams.error === "invalid_state" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            인증 요청이 만료되었거나 올바르지 않습니다. 다시 시도해주세요.
          </p>
        ) : null}
        {searchParams.error === "no_refresh_token" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결에 실패했습니다. Google 계정 설정에서 이 앱의 액세스를 제거한 뒤 다시
            연결해주세요.
          </p>
        ) : null}
        {searchParams.error === "token_exchange_failed" || searchParams.error === "save_failed" ? (
          <p className="mt-4 rounded-md border border-danger bg-danger-bg px-4 py-2 text-sm text-danger">
            Google 계정 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        ) : null}

        {!connected ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Gmail을 사용하려면 먼저 Google 계정을 연결해야 합니다.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 연결
            </a>
          </div>
        ) : loadError ? (
          <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-muted">
              Gmail 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
            >
              Google 계정 다시 연결
            </a>
          </div>
        ) : messages.length === 0 ? (
          <p className="mt-6 text-sm text-muted">받은 메일이 없습니다.</p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-surface">
            {messages.map((message) => (
              <li key={message.id}>
                <Link
                  href={`/gmail/${message.id}`}
                  className="block px-4 py-3 hover:bg-surface-hover"
                >
                  <p className="text-sm font-medium text-foreground">{message.subject}</p>
                  <p className="text-xs text-muted">{message.from}</p>
                  <p className="mt-1 text-xs text-muted">{message.snippet}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
