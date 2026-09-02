export const dynamic = "force-dynamic";

import Link from "next/link";
import { Sidebar } from "@/components/layout/Sidebar";
import { isGoogleConnected, listRecentMessages, type GmailMessageSummary } from "@/lib/google/gmailClient";
import { MessageList } from "./MessageList";

const MAILBOX_LABELS = new Map<string, string>([
  ["inbox", "INBOX"],
  ["sent", "SENT"],
  ["spam", "SPAM"],
  ["trash", "TRASH"],
]);

const MAILBOX_TABS: { value: string; label: string }[] = [
  { value: "inbox", label: "받은편지함" },
  { value: "sent", label: "보낸편지함" },
  { value: "spam", label: "스팸" },
  { value: "trash", label: "휴지통" },
];

const EMPTY_MAILBOX_MESSAGES: Record<string, string> = {
  inbox: "받은 메일이 없습니다.",
  sent: "보낸 메일이 없습니다.",
  spam: "스팸 메일이 없습니다.",
  trash: "휴지통이 비어 있습니다.",
};

export default async function GmailPage({
  searchParams,
}: {
  searchParams: { error?: string; connected?: string; mailbox?: string };
}) {
  const connected = await isGoogleConnected();
  const mailbox =
    searchParams.mailbox && MAILBOX_LABELS.has(searchParams.mailbox) ? searchParams.mailbox : "inbox";
  const labelId = MAILBOX_LABELS.get(mailbox)!;

  let messages: GmailMessageSummary[] = [];
  let loadError = false;

  if (connected) {
    try {
      messages = await listRecentMessages(20, [labelId]);
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

        {connected && !loadError ? (
          <nav aria-label="편지함" className="mt-4 flex gap-1">
            {MAILBOX_TABS.map((tab) => (
              <Link
                key={tab.value}
                href={`/gmail?mailbox=${tab.value}`}
                aria-current={mailbox === tab.value ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  mailbox === tab.value
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        ) : null}

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
          <p className="mt-6 text-sm text-muted">{EMPTY_MAILBOX_MESSAGES[mailbox]}</p>
        ) : (
          <MessageList key={mailbox} messages={messages} />
        )}
      </main>
    </div>
  );
}
