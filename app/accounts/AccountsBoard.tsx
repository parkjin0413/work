"use client";

import { useEffect, useRef, useState } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardAccount, CategoryOption } from "@/lib/accounts/accountsStore";
import { CategoryRowActions } from "./CategoryRowActions";
import { CreateAccountForm } from "./CreateAccountForm";
import { AccountCard } from "./AccountCard";
import { reorderAccountsAction } from "./actions";

const CATEGORY_COLORS = [
  "#6366F1",
  "#F97316",
  "#10B981",
  "#EC4899",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#14B8A6",
];

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

function categoryColor(categories: CategoryOption[], categoryId: string): string {
  const index = categories.findIndex((category) => category.id === categoryId);
  return CATEGORY_COLORS[(index < 0 ? 0 : index) % CATEGORY_COLORS.length];
}

export function AccountsBoard({
  categories,
  accounts: initialAccounts,
}: {
  categories: CategoryOption[];
  accounts: BoardAccount[];
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(categories.map((category) => category.id))
  );
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const prevCategoryIdsRef = useRef<string[]>(categories.map((category) => category.id));

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);

  useEffect(() => {
    const currentIds = categories.map((category) => category.id);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of currentIds) {
        if (!prevCategoryIdsRef.current.includes(id)) {
          next.add(id);
        }
      }
      for (const id of Array.from(next)) {
        if (!currentIds.includes(id)) {
          next.delete(id);
        }
      }
      return next;
    });

    prevCategoryIdsRef.current = currentIds;
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allSelected = selectedIds.size === categories.length;

  function toggleAll() {
    setSelectedIds(allSelected ? new Set() : new Set(categories.map((category) => category.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const categoryOptions = categories;
  const visibleAccounts = accounts.filter((account) => selectedIds.has(account.categoryId));

  function handleDragStart(event: DragStartEvent) {
    setActiveAccountId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveAccountId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const visibleIds = visibleAccounts.map((account) => account.id);
    const oldIndex = visibleIds.indexOf(active.id as string);
    const newIndex = visibleIds.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newVisibleIds = arrayMove(visibleIds, oldIndex, newIndex);

    const previousAccounts = accounts;
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const visiblePositions = accounts.reduce<number[]>((positions, account, index) => {
      if (selectedIds.has(account.categoryId)) positions.push(index);
      return positions;
    }, []);

    const nextAccounts = [...accounts];
    visiblePositions.forEach((position, i) => {
      nextAccounts[position] = accountById.get(newVisibleIds[i])!;
    });

    setAccounts(nextAccounts);
    setErrorMessage(null);

    try {
      await reorderAccountsAction(nextAccounts.map((account) => account.id));
    } catch {
      setAccounts(previousAccounts);
      setErrorMessage("계정 순서 변경에 실패했습니다.");
    }
  }

  const activeAccount = activeAccountId ? accounts.find((account) => account.id === activeAccountId) : null;

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} />
          전체
        </label>
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground"
            style={{ borderLeftColor: categoryColor(categories, category.id), borderLeftWidth: 3 }}
          >
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={selectedIds.has(category.id)}
                onChange={() => toggleOne(category.id)}
              />
              {category.name}
            </label>
            <CategoryRowActions categoryId={category.id} currentName={category.name} />
          </div>
        ))}
      </div>

      <CreateAccountForm categories={categoryOptions} />

      {errorMessage ? (
        <p role="alert" className="mt-4 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {visibleAccounts.length === 0 ? (
        <p className="mt-6 text-sm text-muted">표시할 계정이 없습니다.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveAccountId(null)}
        >
          <SortableContext items={visibleAccounts.map((account) => account.id)} strategy={rectSortingStrategy}>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleAccounts.map((account) => (
                <SortableAccountCard
                  key={account.id}
                  account={account}
                  color={categoryColor(categories, account.categoryId)}
                  categories={categoryOptions}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeAccount ? (
              <div className="rounded-2xl border border-accent bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg">
                {activeAccount.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SortableAccountCard({
  account,
  color,
  categories,
}: {
  account: BoardAccount;
  color: string;
  categories: CategoryOption[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragHandleProps: DragHandleProps = { attributes, listeners };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <AccountCard
        account={account}
        categoryId={account.categoryId}
        categoryName={account.categoryName}
        categories={categories}
        color={color}
        dragHandleProps={dragHandleProps}
      />
    </div>
  );
}
