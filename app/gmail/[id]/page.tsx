import Link from "next/link";
import { notFound } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { getMessageDetail } from "@/lib/google/gmailClient";
import { TrashButton } from "./TrashButton";

export const dynamic = "force-dynamic";

export default async function GmailDetailPage({ params }: { params: { id: string } }) {
  let message;
  try {
    message = await getMessageDetail(params.id);
  } catch {
    return (
      <div className="flex min-h-screen flex-col bg-bg md:flex-row">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <Link href="/gmail" className="text-sm text-muted hover:text-foreground">
            ← 목록으로
          </Link>
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
        </main>
      </div>
    );
  }

  if (!message) {
    notFound();
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <Link href="/gmail" className="text-sm text-muted hover:text-foreground">
          ← 목록으로
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">{message.subject}</h1>
            <p className="mt-1 text-sm text-muted">{message.from}</p>
            <p className="text-xs text-muted">{message.date}</p>
          </div>
          <TrashButton messageId={message.id} />
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm text-foreground">{message.body}</p>
      </main>
    </div>
  );
}
