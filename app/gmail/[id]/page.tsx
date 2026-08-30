import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { getMessageDetail } from "@/lib/google/gmailClient";
import { TrashButton } from "./TrashButton";

export default async function GmailDetailPage({ params }: { params: { id: string } }) {
  const message = await getMessageDetail(params.id);

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
