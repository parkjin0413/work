"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Download, Search, X } from "lucide-react";
import { formatShortDateWeekday, getMondayOfISO } from "@/lib/tasks/week";
import type { WorkItem } from "@/lib/tasks/workItems";
import { searchWorkItemsAction } from "./workItemActions";

const MIN_LENGTH = 2;

/** 지난 기록 검색 + 전체 기록 CSV 내려받기. */
export function WorkSearch({ todayISO }: { todayISO: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WorkItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const trimmed = query.trim();

  useEffect(() => {
    if (trimmed.length < MIN_LENGTH) {
      setResults(null);
      setError(null);
      return;
    }
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const found = await searchWorkItemsAction(trimmed);
        if (seq === requestSeq.current) {
          setResults(found);
          setError(null);
        }
      } catch {
        if (seq === requestSeq.current) setError("검색하지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        if (seq === requestSeq.current) setIsLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const thisYear = todayISO.slice(0, 4);

  return (
    <div className="relative w-full sm:w-auto">
      <div className="flex items-center gap-2">
        <label className="relative flex min-w-0 flex-1 items-center sm:w-[22rem] sm:flex-none">
          <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="지난 기록 검색 (두 글자 이상)"
            aria-label="기록 검색"
            className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-8 text-ui-body text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색 지우기"
              className="absolute right-2 rounded p-0.5 text-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : null}
        </label>
        <a
          href="/tasks/export"
          download
          title="날짜가 있는 기록 전체를 CSV(엑셀)로 내려받기"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-ui-body font-medium text-foreground hover:bg-surface-hover"
        >
          <Download className="h-3.5 w-3.5" aria-hidden="true" />
          <span>전체 기록 CSV</span>
        </a>
      </div>

      {trimmed.length >= MIN_LENGTH ? (
        <div
          role="region"
          aria-label="검색 결과"
          className="mt-2 max-h-[24rem] overflow-y-auto rounded-xl border border-border bg-surface p-2 shadow-[0_4px_16px_rgba(16,24,40,0.08)] sm:absolute sm:right-0 sm:z-20 sm:w-[34rem]"
        >
          {error ? (
            <p className="px-2 py-1 text-ui-body text-danger">{error}</p>
          ) : results === null || (isLoading && results.length === 0) ? (
            <p className="px-2 py-1 text-ui-body text-muted">찾는 중…</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-1 text-ui-body text-muted">&quot;{trimmed}&quot; 기록이 없습니다.</p>
          ) : (
            <>
              <p className="px-2 pb-1 text-ui-meta text-muted">
                {results.length >= 100 ? "최근 100건" : `${results.length}건`} · 누르면 그 주로 이동
              </p>
              <ul className="flex flex-col">
                {results.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/tasks?week=${getMondayOfISO(item.date)}`}
                      onClick={() => setQuery("")}
                      className="flex items-start gap-2 rounded-md px-2 py-1 hover:bg-bg"
                    >
                      <span className="w-[6.2rem] shrink-0 text-ui-meta text-muted">
                        {item.date.slice(0, 4) !== thisYear ? `${item.date.slice(0, 4)}.` : ""}
                        {formatShortDateWeekday(item.date)}
                      </span>
                      <span className="min-w-0 flex-1 text-ui-body text-foreground">
                        <Highlight text={item.body} query={trimmed} />
                        {item.projectName ? (
                          <span className="ml-1.5 text-ui-meta text-muted">· {item.projectName}</span>
                        ) : null}
                      </span>
                      {item.status === "planned" ? (
                        <span className="shrink-0 text-ui-meta text-muted">계획</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Highlight({ text, query }: { text: string; query: string }) {
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded bg-accent/20 px-0.5 text-foreground">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}
