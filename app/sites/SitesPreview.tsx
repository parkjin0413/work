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
import { GripVertical, KeyRound, Pencil, Plus, Search, Star, Trash2 } from "lucide-react";
import {
  buildGroups,
  displayUrl,
  matchesQuery,
  type SiteCategory,
  type SiteGroup,
  type SiteItem,
} from "@/lib/sites/merge";
import {
  createAccountAction,
  deleteAccountAction,
  renameAccountAction,
  reorderAccountsAction,
  createCategoryAction as createAccountCategoryAction,
  renameCategoryAction as renameAccountCategoryAction,
  deleteCategoryAction as deleteAccountCategoryAction,
  reorderCategoriesAction as reorderAccountCategoriesAction,
} from "@/app/accounts/actions";
import {
  createFavoriteAction,
  deleteFavoriteAction,
  renameFavoriteAction,
  reorderFavoritesAction,
  createCategoryAction as createFavoriteCategoryAction,
  renameCategoryAction as renameFavoriteCategoryAction,
  deleteCategoryAction as deleteFavoriteCategoryAction,
  reorderCategoriesAction as reorderFavoriteCategoriesAction,
} from "@/app/favorites/actions";

/** 영역별 분류 저장 기능 (계정 = 계정관리, 즐겨찾기 = 즐겨찾기 테이블) */
const CATEGORY_ACTIONS = {
  account: {
    create: createAccountCategoryAction,
    rename: renameAccountCategoryAction,
    remove: deleteAccountCategoryAction,
  },
  favorite: {
    create: createFavoriteCategoryAction,
    rename: renameFavoriteCategoryAction,
    remove: deleteFavoriteCategoryAction,
  },
} as const;

type DragHandleProps = { attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined };

const ZONES = [
  { source: "account" as const, label: "계정", Icon: KeyRound, iconClass: "text-accent" },
  { source: "favorite" as const, label: "즐겨찾기", Icon: Star, iconClass: "text-accent" },
];

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

export function SitesPreview({ items, categories }: { items: SiteItem[]; categories: SiteCategory[] }) {
  const [query, setQuery] = useState("");
  const { copied, copy } = useCopy();
  const searching = !!query.trim();

  // 계정과 즐겨찾기는 영역을 나누고, 각 영역 안에서 분류 순서대로 묶는다. 검색 중이 아니면 빈 분류도 보여준다.
  const zones = useMemo(() => {
    const filtered = items.filter((item) => matchesQuery(item, query));
    return ZONES.map((zone) => {
      const zoneCategories = categories.filter((c) => c.source === zone.source);
      return {
        ...zone,
        categories: zoneCategories,
        total: items.filter((i) => i.source === zone.source).length,
        groups: buildGroups(zoneCategories, filtered, !query.trim()),
      };
    });
  }, [items, categories, query]);

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
          className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-3 text-[0.75rem] text-foreground shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-shadow placeholder:text-muted focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
        />
      </label>

      {resultCount === 0 ? <p className="py-8 text-center text-[0.75rem] text-muted">검색 결과가 없습니다.</p> : null}

      {zones.map((zone) =>
        searching && zone.groups.length === 0 ? null : (
          <section key={zone.source} aria-label={zone.label} className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                  <zone.Icon size={17} className={zone.iconClass} />
                </span>
                {zone.label}
                <span className="text-[0.75rem] font-normal text-muted">{zone.total}</span>
              </h2>
              <AddCategoryButton source={zone.source} />
            </div>

            {/* 분류 카드를 큰 화면에서 가로 4열로 흘려 담는다. 화면이 좁아지면 카드 폭이 약 300px 아래로 줄지 않게 열 수를 줄인다. */}
            <ZoneGroups
              groups={zone.groups}
              categories={zone.categories}
              source={zone.source}
              canReorder={!searching}
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

/**
 * 다단(columns) 배치의 카드 칸. Safari 는 아래 마진을 다음 단 위로 넘기거나 카드를 단 사이에서 쪼개
 * 간격이 틀어지므로, 마진 대신 inline-block + 아래 안쪽 여백으로 칸을 만든다.
 */
const COLUMN_ITEM_CLASS = "inline-block w-full break-inside-avoid pb-4 align-top";

/** 카드 높이가 제각각인 다단 배치라, 끄는 동안 다른 카드를 밀지 않고 놓을 자리만 표시한다. */
const noShiftStrategy = () => null;

/** 한 영역(계정/즐겨찾기)의 분류 카드들. 분류 제목의 손잡이로 카드 순서를 바꾼다. */
function ZoneGroups({
  groups,
  categories,
  source,
  canReorder,
  copied,
  onCopy,
}: {
  groups: SiteGroup[];
  categories: SiteCategory[];
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
      categories,
      source,
      canReorder,
      copied,
      onCopy,
    };
    return canReorder && g.categoryId ? (
      <SortableGroupCard key={idOf(g)} id={idOf(g)} {...props} />
    ) : (
      <div key={idOf(g)} className={COLUMN_ITEM_CLASS}>
        <GroupCard {...props} />
      </div>
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
    <div ref={setNodeRef} className={COLUMN_ITEM_CLASS}>
      <GroupCard {...props} headerHandle={{ attributes, listeners }} dragState={isDragging ? "dragging" : isOver ? "over" : null} />
    </div>
  );
}

/** 분류 카드: 제목 옆 + 로 추가, 항목마다 수정·삭제. 저장은 기존 계정관리·즐겨찾기 기능을 그대로 쓴다. */
function GroupCard({
  group,
  categories,
  source,
  canReorder,
  copied,
  onCopy,
  headerHandle,
  dragState,
}: {
  group: SiteGroup;
  categories: SiteCategory[];
  source: Source;
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

  const [isRenaming, setIsRenaming] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function handleRenameCategory(name: string) {
    if (!group.categoryId) return;
    setCategoryError(null);
    try {
      await CATEGORY_ACTIONS[source].rename(group.categoryId, name);
      setIsRenaming(false);
      router.refresh();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "분류 이름 변경에 실패했습니다.");
    }
  }

  async function handleDeleteCategory() {
    if (!group.categoryId) return;
    const count = group.items.length;
    const message =
      count > 0
        ? `"${group.name}" 분류를 삭제할까요?\n안에 있는 ${count}개 항목도 함께 삭제되고 되돌릴 수 없습니다.`
        : `"${group.name}" 분류를 삭제할까요?`;
    if (!window.confirm(message)) return;
    setCategoryError(null);
    try {
      await CATEGORY_ACTIONS[source].remove(group.categoryId);
      router.refresh();
    } catch (e) {
      setCategoryError(e instanceof Error ? e.message : "분류 삭제에 실패했습니다.");
    }
  }

  // ID·PW 칸 폭: 이 카드에서 가장 긴 아이디(최소 8자 = 가린 비밀번호 점 길이)에 맞춘다.
  // 같은 카드 안에서는 폭이 같아 세로로 맞고, 짧은 아이디만 있으면 칸이 오른쪽 끝으로 붙는다.
  const credentialChars = Math.max(8, ...items.map((i) => (i.username ?? "").length));

  async function handleDelete(item: SiteItem) {
    if (!window.confirm(`"${item.name}"을(를) 삭제할까요?`)) return;
    setCategoryError(null);
    try {
      if (item.source === "account") await deleteAccountAction(item.rawId);
      else await deleteFavoriteAction(item.rawId);
      router.refresh();
    } catch {
      setCategoryError(`"${item.name}" 삭제에 실패했습니다.`);
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.05),0_4px_14px_-6px_rgba(16,24,40,0.08)] transition-shadow duration-200 ease-out hover:shadow-[0_2px_4px_rgba(16,24,40,0.05),0_14px_28px_-10px_rgba(16,24,40,0.16)] ${dragState === "over" ? "border-accent ring-2 ring-accent" : "border-border"} ${dragState === "dragging" ? "opacity-40" : ""}`}
    >
      {/* 제목 줄: 테마 포인트 색(12%)을 깔아 회색 바탕과 확실히 구분 */}
      <div className="group/header flex items-center justify-between gap-2 border-b border-accent/25 bg-accent/[0.12] px-4 py-3 text-foreground">
        {isRenaming ? (
          <NameInput
            initial={group.name}
            label="분류 이름"
            onSubmit={handleRenameCategory}
            onCancel={() => {
              setIsRenaming(false);
              setCategoryError(null);
            }}
          />
        ) : (
        <h3 className="flex min-w-0 items-center gap-1 text-base font-bold">
          {headerHandle ? (
            <button
              type="button"
              aria-label={`${group.name} 분류 순서 변경`}
              title="끌어서 분류 순서 변경"
              className="-ml-1.5 cursor-grab touch-none rounded p-0.5 opacity-40 hover:bg-surface hover:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover/header:opacity-60"
              {...headerHandle.attributes}
              {...headerHandle.listeners}
            >
              <GripVertical size={16} />
            </button>
          ) : null}
          <span className="truncate">{group.name}</span>
          <span className="ml-0.5 text-sm font-medium opacity-60">{group.items.length}</span>
        </h3>
        )}
        {group.categoryId && !isRenaming ? (
          <div className="flex shrink-0 items-center">
            {/* 분류 이름 변경·삭제: PC에서는 제목 줄에 마우스를 올릴 때만 */}
            <span className="flex items-center sm:opacity-0 sm:group-focus-within/header:opacity-100 sm:group-hover/header:opacity-100">
              <button
                type="button"
                onClick={() => setIsRenaming(true)}
                aria-label={`${group.name} 분류 이름 변경`}
                title="분류 이름 변경"
                className="rounded-md p-1 opacity-60 hover:bg-surface hover:opacity-100"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                aria-label={`${group.name} 분류 삭제`}
                title="분류 삭제"
                className="rounded-md p-1 text-danger opacity-70 hover:bg-surface hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </span>
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                setEditingId(null);
              }}
              aria-label={`${group.name}에 추가`}
              title="항목 추가"
              className="rounded-md p-1 opacity-60 hover:bg-surface hover:opacity-100"
            >
              <Plus size={18} />
            </button>
          </div>
        ) : null}
      </div>
      {categoryError ? (
        <p role="alert" className="px-3 pt-1 text-xs text-danger">
          {categoryError}
        </p>
      ) : null}
      {group.items.length === 0 && !isAdding ? (
        <p className="px-3 py-3 text-sm text-muted">항목이 없습니다. + 로 추가하세요.</p>
      ) : null}
      {reorderError ? (
        <p role="alert" className="px-3 pt-1 text-xs text-danger">
          {reorderError}
        </p>
      ) : null}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
      <ul className="flex flex-col divide-y divide-accent/15">
        {items.map((item) =>
          editingId === item.id ? (
            <li key={item.id}>
              <ItemForm
                source={source}
                categories={categories}
                initial={item}
                defaultCategoryId={item.categoryId}
                submitLabel="저장"
                onCancel={() => setEditingId(null)}
                onSubmit={async (v) => {
                  if (source === "account") {
                    await renameAccountAction({ id: item.rawId, ...v });
                  } else {
                    await renameFavoriteAction({ id: item.rawId, name: v.name, url: v.url, categoryId: v.categoryId });
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
                credentialChars,
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
          categories={categories}
          initial={null}
          defaultCategoryId={group.categoryId}
          submitLabel="추가"
          onCancel={() => setIsAdding(false)}
          onSubmit={async (v) => {
            if (source === "account") await createAccountAction(v);
            else await createFavoriteAction({ categoryId: v.categoryId, name: v.name, url: v.url });
            setIsAdding(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

type FormValues = {
  categoryId: string;
  name: string;
  url: string;
  username: string;
  password: string;
  memo: string;
};

const INPUT_CLASS =
  "w-full rounded-md border border-border bg-bg px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

function ItemForm({
  source,
  categories,
  initial,
  defaultCategoryId,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  source: Source;
  categories: SiteCategory[];
  initial: SiteItem | null;
  defaultCategoryId: string;
  submitLabel: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [v, setV] = useState<FormValues>({
    categoryId: defaultCategoryId,
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
      <label className="flex items-center gap-2 text-xs text-muted">
        <span className="shrink-0">분류</span>
        <select value={v.categoryId} onChange={set("categoryId")} aria-label="분류" className={INPUT_CLASS}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
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

/** 분류 이름 한 줄 입력 (추가·이름 변경 공용). Enter 저장, Esc 취소. */
function NameInput({
  initial,
  label,
  onSubmit,
  onCancel,
}: {
  initial: string;
  label: string;
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await onSubmit(name.trim());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-1.5">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel();
        }}
        placeholder={label}
        aria-label={label}
        autoFocus
        className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <button
        type="submit"
        disabled={isSaving || !name.trim()}
        className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground disabled:opacity-50"
      >
        {isSaving ? "저장 중" : "저장"}
      </button>
      <button type="button" onClick={onCancel} className="shrink-0 rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted">
        취소
      </button>
    </form>
  );
}

/** 영역 제목 옆 "+ 분류 추가" */
function AddCategoryButton({ source }: { source: Source }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-dashed border-border px-2.5 py-1 text-sm text-muted hover:border-accent hover:text-accent"
      >
        + 분류 추가
      </button>
    );
  }

  return (
    <div className="flex min-w-[13rem] flex-col gap-1">
      <NameInput
        initial=""
        label="새 분류 이름"
        onSubmit={async (name) => {
          setError(null);
          try {
            await CATEGORY_ACTIONS[source].create(name);
            setIsOpen(false);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "분류 추가에 실패했습니다.");
          }
        }}
        onCancel={() => {
          setIsOpen(false);
          setError(null);
        }}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
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
    <div className="grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] items-center gap-x-1 leading-6">
      {secret ? (
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "비밀번호 숨기기" : "비밀번호 보기"}
          title={reveal ? "눌러서 숨기기" : "눌러서 비밀번호 보기"}
          className={`rounded px-1 py-0.5 text-left text-[0.55rem] font-semibold tracking-wider transition-colors ${
            reveal ? "bg-accent/10 text-accent" : "text-muted hover:bg-accent/[0.06] hover:text-accent"
          }`}
        >
          {label}
        </button>
      ) : (
        <span className="px-1 text-[0.55rem] font-semibold tracking-wider text-muted">{label}</span>
      )}
      <button
        type="button"
        onClick={() => onCopy(copyKey, value)}
        title={`${label} 복사`}
        aria-label={`${label} 복사`}
        className={`min-w-0 rounded-md px-1.5 text-left text-[0.725rem] transition-colors ${
          isCopied ? "bg-accent/10 text-accent" : "text-foreground hover:bg-accent/[0.06] hover:text-accent"
        }`}
      >
        {/* 복사 아이콘 없이, 복사되면 값 자리에 잠깐 "복사됨" */}
        <span className={`block truncate ${secret && !reveal && !isCopied ? "tracking-[0.15em] text-muted" : ""}`}>
          {isCopied ? "복사됨" : secret && !reveal ? "••••••••" : value}
        </span>
      </button>
    </div>
  );
}

/** 한 항목: 왼쪽 [이름 + 수정·삭제] / 주소, 오른쪽 ID·PW 두 줄, 아래 메모. */
function SiteRow({
  item,
  credentialChars,
  copied,
  onCopy,
  onEdit,
  onDelete,
  dragHandle,
}: {
  item: SiteItem;
  /** 이 카드에서 가장 긴 아이디 글자 수 — ID·PW 칸 폭 계산용 */
  credentialChars: number;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  dragHandle?: DragHandleProps;
}) {
  return (
    <div className="group relative flex flex-col py-[0.55rem] pl-1.5 pr-3 transition-colors duration-150 before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity hover:bg-accent/[0.04] hover:before:opacity-100">
      {/* 휴대폰: 이름이 잘리지 않게 ID·PW 를 이름 아래 줄로 내린다 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:flex-nowrap">
        {dragHandle ? (
          <button
            type="button"
            aria-label={`${item.name} 순서 변경`}
            title="끌어서 순서 변경"
            className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted opacity-40 hover:bg-bg hover:opacity-100 active:cursor-grabbing sm:opacity-0 sm:group-hover:opacity-60"
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
              className="truncate text-[0.85rem] font-semibold leading-6 text-foreground hover:text-accent"
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
            className="mt-0.5 line-clamp-2 break-all text-[0.65rem] leading-[1.35] tracking-[-0.01em] text-muted opacity-70 hover:text-accent hover:opacity-100"
          >
            {displayUrl(item.url)}
          </a>
        </div>
        {item.username || item.password ? (
          <div
            className={`ml-auto flex max-w-[58%] shrink-0 flex-col text-[0.725rem] max-sm:ml-0 max-sm:!w-full max-sm:max-w-none ${
              dragHandle ? "max-sm:pl-7" : ""
            }`}
            // 라벨(1.75rem) + 간격 + 값 글자 수(ch) + 좌우 안쪽 여백
            style={{ width: `calc(1.75rem + 0.25rem + ${credentialChars + 1}ch + 0.75rem)` }}
          >
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
        <p className={`mt-2 whitespace-pre-line break-words border-l-2 border-border pl-2.5 text-[0.725rem] leading-relaxed text-muted ${dragHandle ? "ml-6" : ""}`}>
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
