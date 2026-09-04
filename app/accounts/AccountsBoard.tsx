"use client";

import { useEffect, useState } from "react";
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
import type { AccountSummary, CategoryWithAccounts } from "@/lib/accounts/accountsStore";
import { CategoryRowActions } from "./CategoryRowActions";
import { CreateAccountForm } from "./CreateAccountForm";
import { AccountCard } from "./AccountCard";
import { reorderAccountsAction } from "./actions";

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

type DragItemData = { categoryId: string };

const CARD_GRID_STYLE = { gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" };

export function AccountsBoard({ categories: initialCategories }: { categories: CategoryWithAccounts[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name }));

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as DragItemData | undefined;
    if (!data) return;

    const category = categories.find((c) => c.id === data.categoryId);
    setActiveLabel(category?.accounts.find((a) => a.id === event.active.id)?.name ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const data = active.data.current as DragItemData | undefined;
    if (!data) return;

    const categoryIndex = categories.findIndex((c) => c.id === data.categoryId);
    if (categoryIndex === -1) return;

    const accounts = categories[categoryIndex].accounts;
    const oldIndex = accounts.findIndex((a) => a.id === active.id);
    const newIndex = accounts.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousCategories = categories;
    const reorderedAccounts = arrayMove(accounts, oldIndex, newIndex);
    const nextCategories = categories.map((c, index) =>
      index === categoryIndex ? { ...c, accounts: reorderedAccounts } : c
    );
    setCategories(nextCategories);
    setErrorMessage(null);

    try {
      await reorderAccountsAction(reorderedAccounts.map((a) => a.id));
    } catch {
      setCategories(previousCategories);
      setErrorMessage("계정 순서 변경에 실패했습니다.");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveLabel(null)}
      >
        {categories.map((category) => (
          <section key={category.id}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-foreground">{category.name}</h2>
              <div className="flex items-center gap-2">
                <CategoryRowActions categoryId={category.id} currentName={category.name} />
                <CreateAccountForm categoryId={category.id} />
              </div>
            </div>

            {category.accounts.length === 0 ? (
              <p className="mt-3 text-sm text-muted">등록된 계정이 없습니다.</p>
            ) : (
              <SortableContext
                items={category.accounts.map((account) => account.id)}
                strategy={rectSortingStrategy}
              >
                <div className="mt-3 grid gap-6" style={CARD_GRID_STYLE}>
                  {category.accounts.map((account) => (
                    <SortableAccountCard
                      key={account.id}
                      account={account}
                      categoryId={category.id}
                      categories={categoryOptions}
                    />
                  ))}
                </div>
              </SortableContext>
            )}
          </section>
        ))}

        <DragOverlay>
          {activeLabel ? (
            <div className="rounded-2xl border border-accent bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg">
              {activeLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableAccountCard({
  account,
  categoryId,
  categories,
}: {
  account: AccountSummary;
  categoryId: string;
  categories: { id: string; name: string }[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
    data: { categoryId } satisfies DragItemData,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragHandleProps: DragHandleProps = { attributes, listeners };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <AccountCard account={account} categoryId={categoryId} categories={categories} dragHandleProps={dragHandleProps} />
    </div>
  );
}
