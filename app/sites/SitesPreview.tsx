"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DraggableAttributes,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, GripVertical, KeyRound, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import { displayUrl, groupByOriginal, matchesQuery, type SiteGroup, type SiteItem } from "@/lib/sites/merge";
import {
  createAccountAction,
  deleteAccountAction,
  renameAccountAction,
  reorderAccountsAction,
  reorderCategoriesAction as reorderAccountCategoriesAction,
} from "@/app/accounts/actions";
import {
  createFavoriteAction,
  deleteFavoriteAction,
  renameFavoriteAction,
  reorderFavoritesAction,
  reorderCategoriesAction as reorderFavoriteCategoriesAction,
} from "@/app/favorites/actions";

type DragHandleProps = { attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined };

const ZONES = [
  { source: "account" as const, label: "계정", Icon: KeyRound, iconClass: "text-accent" },
  { source: "favorite" as const, label: "즐겨찾기", Icon: Star, iconClass: "text-amber-500" },
];

/** 분류 제목 줄 파스텔 배경. 항목 부분은 흰 배경 그대로라 튀지 않는다. */
const HEADER_TONES = [
  "border-sky-100 bg-sky-50 text-sky-900 dark:border-sky-400/15 dark:bg-sky-400/10 dark:text-sky-100",
  "border-violet-100 bg-violet-50 text-violet-900 dark:border-violet-400/15 dark:bg-violet-400/10 dark:text-violet-100",
  "border-emerald-100 bg-emerald-50 text-emerald-900 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-100",
  "border-amber-100 bg-amber-50 text-amber-900 dark:border-amber-400/15 dark:bg-amber-400/10 dark:text-amber-100",
  "border-rose-100 bg-rose-50 text-rose-900 dark:border-rose-400/15 dark:bg-rose-400/10 dark:text-rose-100",
  "border-teal-100 bg-teal-50 text-teal-900 dark:border-teal-400/15 dark:bg-teal-400/10 dark:text-teal-100",
  "border-indigo-100 bg-indigo-50 text-indigo-900 dark:border-indigo-400/15 dark:bg-indigo-400/10 dark:text-indigo-100",
  "border-orange-100 bg-orange-50 text-orange-900 dark:border-orange-400/15 dark:bg-orange-400/10 dark:text-orange-100",
];

/** 분류 이름으로 색을 정해서, 순서를 옮겨도 같은 분류는 같은 색을 유지한다. */
function toneOf(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return HEADER_TONES[hash % HEADER_TONES.length];
}

/** 누르면 복사하고 1.5초간 체크 표시 */
function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(key);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 1500);
  }
  return { copied, copy };
}

export function SitesPreview({ items }: { items: SiteItem[] }) {
  const [query, setQuery] = useState("");
  const { copied, copy } = useCopy();

  // 계정과 즐겨찾기는 영역을 나누고, 각 영역 안에서 기존 분류대로 묶는다.
  const zones = useMemo(() => {
    const filtered = items.filter((item) => matchesQuery(item, query));
    return ZONES.map((zone) => ({
      ...zone,
      total: items.filter((i) => i.source === zone.source).length,
      groups: groupByOriginal(filtered.filter((i) => i.source === zone.source)),
    }));
  }, [items, query]);

  const resultCount = zones.reduce((n, z) => n + z.groups.reduce((m, g) => m + g.items.length, 0), 0);

  return (
    <div className="mt-4 flex flex-col gap-5">
      <label className="relative max-w-md">
        <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름·주소·아이디·메모 검색"
          aria-label="검색"
          className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-[15px] text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>

      {resultCount === 0 ? <p className="py-8 text-center text-[15px] text-muted">검색 결과가 없습니다.</p> : null}

      {zones.map((zone) =>
        zone.groups.length === 0 ? null : (
          <section key={zone.source} aria-label={zone.label} className="flex flex-col gap-2.5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <zone.Icon size={18} className={zone.iconClass} />
              {zone.label}
              <span className="text-[15px] font-normal text-muted">{zone.total}</span>
            </h2>

            {/* 분류 카드를 큰 화면에서 가로 4열로 흘려 담는다. 화면이 좁아지면 카드 폭이 약 300px 아래로 줄지 않게 열 수를 줄인다. */}
            <ZoneGroups
              groups={zone.groups}
              source={zone.source}
              canReorder={!query.trim()}
              copied={copied}
              onCopy={copy}
            />
          </section>
        )
      )}
    </div>
  );
}

type Source = SiteItem["source"];

/** 카드 높이가 제각각인 다단 배치라, 끄는 동안 다른 카드를 밀지 않고 놓을 자리만 표시한다. */
const noShiftStrategy = () => null;

/** 한 영역(계정/즐겨찾기)의 분류 카드들. 분류 제목의 손잡이로 카드 순서를 바꾼다. */
function ZoneGroups({
  groups,
  source,
  canReorder,
  copied,
  onCopy,
}: {
  groups: SiteGroup[];
  source: Source;
  canReorder: boolean;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const [order, setOrder] = useState(groups);
  const [activeName, setActiveName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setOrder(groups), [groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const idOf = (g: SiteGroup) => `group-${g.categoryId ?? g.name}`;

  function handleDragStart(event: DragStartEvent) {
    setActiveName(order.find((g) => idOf(g) === event.active.id)?.name ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveName(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((g) => idOf(g) === active.id);
    const newIndex = order.findIndex((g) => idOf(g) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = order;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    setError(null);
    try {
      const ids = next.map((g) => g.categoryId).filter((id): id is string => !!id);
      if (source === "account") await reorderAccountCategoriesAction(ids);
      else await reorderFavoriteCategoriesAction(ids);
    } catch {
      setOrder(previous);
      setError("분류 순서 변경에 실패했습니다.");
    }
  }

  const cards = order.map((g) => {
    const props = {
      group: g,
      source,
      tone: toneOf(g.name),
      canReorder,
      copied,
      onCopy,
    };
    return canReorder && g.categoryId ? (
      <SortableGroupCard key={g.name} id={idOf(g)} {...props} />
    ) : (
      <GroupCard key={g.name} {...props} />
    );
  });

  return (
    <>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveName(null)}
      >
        <SortableContext items={order.map(idOf)} strategy={noShiftStrategy}>
          <div className="columns-1 gap-4 lg:columns-2 xl:columns-3 2xl:columns-4">{cards}</div>
        </SortableContext>
        <DragOverlay>
          {activeName ? (
            <div className="rounded-xl border border-accent bg-surface px-4 py-2.5 text-base font-bold text-foreground shadow-lg">
              {activeName}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
}

function SortableGroupCard({ id, ...props }: { id: string } & Omit<Parameters<typeof GroupCard>[0], "headerHandle" | "dragState">) {
  const { attributes, listeners, setNodeRef, isDragging, isOver } = useSortable({ id });
  return (
    <div ref={setNodeRef} className="mb-4 break-inside-avoid">
      <GroupCard {...props} headerHandle={{ attributes, listeners }} dragState={isDragging ? "dragging" : isOver ? "over" : null} />
    </div>
  );
}

/** 분류 카드: 제목 옆 + 로 추가, 항목마다 수정·삭제. 저장은 기존 계정관리·즐겨찾기 기능을 그대로 쓴다. */
function GroupCard({
  group,
  source,
  tone,
  canReorder,
  copied,
  onCopy,
  headerHandle,
  dragState,
}: {
  group: SiteGroup;
  source: Source;
  tone: string;
  /** 검색 중에는 일부만 보이므로 순서 변경을 막는다 */
  canReorder: boolean;
  headerHandle?: DragHandleProps;
  dragState?: "dragging" | "over" | null;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  // 드래그 중에는 화면 순서를 먼저 바꾸고, 저장에 실패하면 되돌린다.
  const [items, setItems] = useState(group.items);
  const [reorderError, setReorderError] = useState<string | null>(null);
  useEffect(() => setItems(group.items), [group.items]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const previous = items;
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setReorderError(null);
    try {
      const ids = next.map((i) => i.rawId);
      if (source === "account") await reorderAccountsAction(ids);
      else await reorderFavoritesAction(ids);
    } catch {
      setItems(previous);
      setReorderError("순서 변경에 실패했습니다.");
    }
  }

  async function handleDelete(item: SiteItem) {
    if (!window.confirm(`"${item.name}"을(를) 삭제할까요?`)) return;
    if (item.source === "account") await deleteAccountAction(item.rawId);
    else await deleteFavoriteAction(item.rawId);
    router.refresh();
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-surface shadow-sm ${headerHandle ? "" : "mb-4 break-inside-avoid"} ${
        dragState === "over" ? "border-accent ring-2 ring-accent" : "border-border"
      } ${dragState === "dragging" ? "opacity-40" : ""}`}
    >
      {/* 분류 제목: 옅은 배경 띠로 카드 안 항목들과 구분 */}
      <div className={`group/header flex items-center justify-between gap-2 border-b px-3 py-2.5 ${tone}`}>
        <h3 className="flex items-center gap-1 text-base font-bold">
          {headerHandle ? (
            <button
              type="button"
              aria-label={`${group.name} 분류 순서 변경`}
              title="끌어서 분류 순서 변경"
              className="-ml-1.5 cursor-grab touch-none rounded p-0.5 opacity-40 hover:bg-white/70 hover:opacity-100 active:cursor-grabbing dark:hover:bg-white/10 sm:opacity-0 sm:group-hover/header:opacity-60"
              {...headerHandle.attributes}
              {...headerHandle.listeners}
            >
              <GripVertical size={16} />
            </button>
          ) : null}
          {group.name} <span className="ml-0.5 text-sm font-medium opacity-60">{group.items.length}</span>
        </h3>
        {group.categoryId ? (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              setEditingId(null);
            }}
            aria-label={`${group.name}에 추가`}
            title="추가"
            className="rounded-md p-1 opacity-60 hover:bg-white/70 hover:opacity-100 dark:hover:bg-white/10"
          >
            <Plus size={18} />
          </button>
        ) : null}
      </div>
      {reorderError ? (
        <p role="alert" className="px-3 pt-1 text-xs text-danger">
          {reorderError}
        </p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col divide-y divide-border">
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id}>
              <ItemForm
                source={source}
                initial={item}
                submitLabel="저장"
                onCancel={() => setEditingId(null)}
                onSubmit={async (v) => {
                  if (source === "account") {
                    await renameAccountAction({ id: item.rawId, categoryId: item.categoryId, ...v });
                  } else {
                    await renameFavoriteAction({ id: item.rawId, name: v.name, url: v.url });
                  }
                  setEditingId(null);
                  router.refresh();
                }}
              />
            </li>
          ) : (
            (() => {
              const rowProps = {
                item,
                copied,
                onCopy,
                onEdit: () => {
                  setEditingId(item.id);
                  setIsAdding(false);
                },
                onDelete: () => handleDelete(item),
              };
              return canReorder ? (
                <SortableSiteRow key={item.id} {...rowProps} />
              ) : (
                <li key={item.id}>
                  <SiteRow {...rowProps} />
                </li>
              );
            })()
          )
        )}
      </ul>
      </SortableContext>
      </DndContext>
      {isAdding && group.categoryId ? (
        <ItemForm
          source={source}
          initial={null}
          submitLabel="추가"
          onCancel={() => setIsAdding(false)}
          onSubmit={async (v) => {
            const categoryId = group.categoryId!;
            if (source === "account") await createAccountAction({ categoryId, ...v });
            else await createFavoriteAction({ categoryId, name: v.name, url: v.url });
            setIsAdding(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

type FormValues = { name: string; url: string; username: string; password: string; memo: string };

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

function ItemForm({
  source,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  source: Source;
  initial: SiteItem | null;
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<FormValues>({
    name: initial?.name ?? "",
    url: initial?.url ?? "https://",
    username: initial?.username ?? "",
    password: initial?.password ?? "",
    memo: initial?.memo ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof FormValues) => (e: { target: { value: string } }) =>
    setV((prev) => ({ ...prev, [key]: e.target.value }));
  const isAccount = source === "account";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await onSubmit(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="m-2 flex flex-col gap-1.5 rounded-lg border border-accent bg-surface p-2">
      <input value={v.name} onChange={set("name")} placeholder="이름" aria-label="이름" autoFocus className={INPUT_CLASS} />
      <input value={v.url} onChange={set("url")} placeholder="https://" aria-label="주소" className={INPUT_CLASS} />
      {isAccount ? (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <input
              value={v.username}
              onChange={set("username")}
              placeholder="아이디"
              aria-label="아이디"
              autoComplete="off"
              className={INPUT_CLASS}
            />
            <input
              value={v.password}
              onChange={set("password")}
              placeholder="비밀번호"
              aria-label="비밀번호"
              autoComplete="new-password"
              className={INPUT_CLASS}
            />
          </div>
          <input value={v.memo} onChange={set("memo")} placeholder="메모 (선택)" aria-label="메모" className={INPUT_CLASS} />
        </>
      ) : null}
      <div className="flex items-center gap-1.5">
        <button
          type="submit"
          disabled={isSaving || !v.name.trim()}
          className="rounded-md bg-accent px-2.5 py-1 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-border px-2.5 py-1 text-sm text-muted">
          취소
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** 아이디·비밀번호 한 줄: 값을 누르면 복사. 비밀번호는 가려두고 눈 아이콘으로 보기. */
function CredentialLine({
  label,
  value,
  secret,
  copyKey,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  secret?: boolean;
  copyKey: string;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const [reveal, setReveal] = useState(false);
  const isCopied = copied === copyKey;

  return (
    <div className="flex min-w-0 items-center gap-2 leading-6">
      <span className="w-6 shrink-0 text-[12px] font-semibold tracking-wide text-muted">{label}</span>
      <button
        type="button"
        onClick={() => onCopy(copyKey, value)}
        title={`${label} 복사`}
        aria-label={`${label} 복사`}
        className={`flex min-w-0 items-center gap-1.5 rounded px-1 text-left text-[15px] ${
          isCopied ? "bg-accent/10 text-accent" : "text-foreground hover:bg-bg"
        }`}
      >
        <span className="truncate">{secret && !reveal ? "••••••••" : value}</span>
        {isCopied ? (
          <Check size={14} className="shrink-0" />
        ) : (
          <Copy size={13} className="shrink-0 text-muted opacity-60" />
        )}
      </button>
      {secret ? (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "비밀번호 숨기기" : "비밀번호 보기"}
          title={reveal ? "숨기기" : "보기"}
          className="shrink-0 rounded p-0.5 text-muted hover:text-foreground"
        >
          {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      ) : null}
    </div>
  );
}

/** 한 항목: 왼쪽 [이름 + 수정·삭제] / 주소, 오른쪽 ID·PW 두 줄, 아래 메모. */
function SiteRow({
  item,
  copied,
  onCopy,
  onEdit,
  onDelete,
  dragHandle,
}: {
  item: SiteItem;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandle?: DragHandleProps;
}) {
  return (
    <div className="group flex flex-col py-3 pl-1 pr-3 hover:bg-surface-hover">
      <div className="flex items-start gap-2">
        {dragHandle ? (
          <button
            type="button"
            aria-label={`${item.name} 순서 변경`}
            title="끌어서 순서 변경"
            className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted opacity-40 hover:bg-bg hover:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-60"
            {...dragHandle.attributes}
            {...dragHandle.listeners}
          >
            <GripVertical size={16} />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-w-0 items-center gap-1">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.url}
              className="truncate text-[15.9px] font-semibold leading-6 text-foreground hover:text-accent"
            >
              {item.name}
            </a>
            {/* 수정·삭제: 이름 바로 옆. PC에서는 마우스를 올릴 때만, 터치 화면에서는 항상 보인다 */}
            <span className="flex shrink-0 items-center sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={onEdit}
                aria-label={`${item.name} 수정`}
                title="수정"
                className="rounded p-1 text-muted hover:bg-bg hover:text-foreground"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={onDelete}
                aria-label={`${item.name} 삭제`}
                title="삭제"
                className="rounded p-1 text-danger hover:bg-bg"
              >
                <Trash2 size={14} />
              </button>
            </span>
          </div>
          {/* 주소는 최대한 다 보이게: 잘라내지 않고 줄바꿈, 정말 긴 경우만 두 줄에서 끊는다 */}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={item.url}
            className="mt-0.5 line-clamp-2 break-all text-[13px] leading-[1.35] text-muted opacity-70 hover:text-accent hover:opacity-100"
          >
            {displayUrl(item.url)}
          </a>
        </div>
        {item.username || item.password ? (
          <div className="flex min-w-0 max-w-[50%] shrink-0 flex-col">
            {item.username ? (
              <CredentialLine label="ID" value={item.username} copyKey={`${item.id}-id`} copied={copied} onCopy={onCopy} />
            ) : null}
            {item.password ? (
              <CredentialLine label="PW" value={item.password} secret copyKey={`${item.id}-pw`} copied={copied} onCopy={onCopy} />
            ) : null}
          </div>
        ) : null}
      </div>
      {item.memo ? (
        <p className={`mt-1.5 whitespace-pre-line break-words rounded-md bg-bg px-2 py-1 text-[15px] leading-snug text-foreground ${dragHandle ? "ml-6" : ""}`}>
          {item.memo}
        </p>
      ) : null}
    </div>
  );
}

/** 드래그로 순서를 바꿀 수 있는 항목 (같은 분류 안에서만). */
function SortableSiteRow(props: Omit<Parameters<typeof SiteRow>[0], "dragHandle">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? "relative z-10 bg-surface opacity-80 shadow-lg" : ""}
    >
      <SiteRow {...props} dragHandle={{ attributes, listeners }} />
    </li>
  );
}
