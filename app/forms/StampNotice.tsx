import Link from "next/link";

export function StampNotice({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      {message}{" "}
      <Link href="/forms" className="font-semibold underline">
        도장 등록하러 가기
      </Link>
    </div>
  );
}
