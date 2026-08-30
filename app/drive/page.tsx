import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DrivePage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <AppHeader />
      <div className="p-6">
        <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-200">
          ← 홈으로
        </Link>
        <h1 className="mt-4 text-lg font-semibold text-neutral-50">Google Drive</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Google Drive 연동 기능은 다음 단계에서 구현됩니다.
        </p>
      </div>
    </main>
  );
}
