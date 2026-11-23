"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CornerDownLeft, Search, X } from "lucide-react";
import { searchEverythingAction } from "@/app/navActions";
import { SEARCH_GROUPS, type SearchHit } from "@/lib/search/types";

type Props = { open: boolean; onClose: () => void; menus: { href: string; label: string }[] };

const isExternal = (href: string) => /^https?:\/\//.test(href);

/**
 * 통합 검색 창 (Ctrl+K / ⌘K). 업무·일정·양식·어카운트·회사·웹·제품에서 이름·제목으로 찾는다.
 * ↑↓ 로 고르고 Enter 로 연다. 어카운트 항목은 그 사이트를 새 탭으로 연다.
 */
export function CommandPalette({ open, onClose, menus }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  // 입력이 멈추고 0.2초 뒤에 찾는다. 늦게 온 예전 결과는 버린다.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const found = await searchEverythingAction(q);
        if (!cancelled) {
          setHits(found);
          setActive(0);
        }
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // 검색어가 없으면 메뉴 바로가기를 보여준다.
  const items: SearchHit[] = useMemo(
    () =>
      query.trim()
        ? [...hits].sort((a, b) => SEARCH_GROUPS.indexOf(a.group) - SEARCH_GROUPS.indexOf(b.group))
        : menus.map((m) => ({ group: m.label as SearchHit["group"], title: `${m.label} 메뉴로 이동`, detail: null, href: m.href })),
    [query, hits, menus],
  );

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function openHit(hit: SearchHit) {
    onClose();
    if (isExternal(hit.href)) window.open(hit.href, "_blank", "noopener,noreferrer");
    else router.push(hit.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[12vh] print:hidden"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="통합 검색"
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-2 border-b border-border px-4">
          <Search size={17} className="shrink-0 text-muted" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.nativeEvent.isComposing) return;
              if (e.key === "Escape") onClose();
              else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                openHit(items[active]);
              }
            }}
            placeholder="업무·일정·문서·계정·회사·제품 검색"
            aria-label="통합 검색어"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-activedescendant={items[active] ? `command-hit-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded p-1 text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>

        <ul ref={listRef} id="command-palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto py-1.5">
          {query.trim() && !loading && items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">찾는 내용이 없습니다.</li>
          ) : null}
          {query.trim() && loading && items.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-muted">찾는 중…</li>
          ) : null}
          {items.map((hit, index) => {
            const showGroup = query.trim() && (index === 0 || items[index - 1].group !== hit.group);
            return (
              <li key={`${hit.group}-${hit.href}-${hit.title}-${index}`} role="presentation">
                {showGroup ? (
                  <p className="px-4 pb-1 pt-2.5 text-[0.65rem] font-semibold tracking-wide text-muted">{hit.group}</p>
                ) : null}
                <button
                  type="button"
                  id={`command-hit-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => openHit(hit)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                    index === active ? "bg-accent/10 text-foreground" : "text-foreground"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{hit.title}</span>
                    {hit.detail ? <span className="block truncate text-xs text-muted">{hit.detail}</span> : null}
                  </span>
                  {isExternal(hit.href) ? (
                    <ArrowUpRight size={14} className="shrink-0 text-muted" aria-label="새 탭" />
                  ) : index === active ? (
                    <CornerDownLeft size={14} className="shrink-0 text-muted" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="hidden border-t border-border px-4 py-2 text-[0.65rem] text-muted sm:block">
          ↑↓ 이동 · Enter 열기 · Esc 닫기 · 어디서나 Ctrl+K (맥은 ⌘K)
        </p>
      </div>
    </div>
  );
}
