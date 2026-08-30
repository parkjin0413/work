import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getMessageDetail } from "@/lib/google/gmailClient";
import { TrashButton } from "./TrashButton";

export const dynamic = "force-dynamic";

export default async function GmailDetailPage({ params }: { params: { id: string } }) {
  let message;
  try {
    message = await getMessageDetail(params.id);
  } catch {
    return (
      <main className="min-h-screen bg-neutral-950">
        <AppHeader />
        <div className="p-6">
          <Link href="/gmail" className="text-sm text-neutral-400 hover:text-neutral-200">
            ← 목록으로
          </Link>
          <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900 p-6">
            <p className="text-sm text-neutral-400">
              Gmail 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.
            </p>
            <a
              href="/api/auth/google/start"
              className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            >
              Google 계정 다시 연결
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!message) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/gmail" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 목록으로
        </Link>
        <div className="mt-4 flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-neutral-50">{message.subject}</h1>
            <p className="mt-1 text-sm text-neutral-400">{message.from}</p>
            <p className="text-xs text-neutral-500">{message.date}</p>
          </div>
          <TrashButton messageId={message.id} />
        </div>
        <p className="mt-6 whitespace-pre-wrap text-sm text-neutral-200">{message.body}</p>
      </div>
    </main>
  );
}
