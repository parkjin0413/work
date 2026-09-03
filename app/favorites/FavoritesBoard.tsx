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
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CategoryWithFavorites, FavoriteSummary } from "@/lib/favorites/favoritesStore";
import { CreateFavoriteForm } from "./CreateFavoriteForm";
import { CategoryRowActions } from "./CategoryRowActions";
import { FavoriteRowActions } from "./FavoriteRowActions";
import { reorderCategoriesAction, reorderFavoritesAction } from "./actions";

type DragItemData = { type: "category" } | { type: "favorite"; categoryId: string };

export function FavoritesBoard({ categories: initialCategories }: { categories: CategoryWithFavorites[] }) {
  const [categories, setCategories] = useState(initialCategories);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

    if (data.type === "category") {
      setActiveLabel(categories.find((category) => category.id === event.active.id)?.name ?? null);
      return;
    }

    const category = categories.find((c) => c.id === data.categoryId);
    setActiveLabel(category?.favorites.find((f) => f.id === event.active.id)?.name ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const data = active.data.current as DragItemData | undefined;
    if (!data) return;

    if (data.type === "category") {
      const oldIndex = categories.findIndex((c) => c.id === active.id);
      const newIndex = categories.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const previousCategories = categories;
      const reordered = arrayMove(categories, oldIndex, newIndex);
      setCategories(reordered);
      setErrorMessage(null);

      try {
        await reorderCategoriesAction(reordered.map((c) => c.id));
      } catch {
        setCategories(previousCategories);
        setErrorMessage("카테고리 순서 변경에 실패했습니다.");
      }
      return;
    }

    const categoryIndex = categories.findIndex((c) => c.id === data.categoryId);
    if (categoryIndex === -1) return;

    const favorites = categories[categoryIndex].favorites;
    const oldIndex = favorites.findIndex((f) => f.id === active.id);
    const newIndex = favorites.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousCategories = categories;
    const reorderedFavorites = arrayMove(favorites, oldIndex, newIndex);
    const nextCategories = categories.map((c, index) =>
      index === categoryIndex ? { ...c, favorites: reorderedFavorites } : c
    );
    setCategories(nextCategories);
    setErrorMessage(null);

    try {
      await reorderFavoritesAction(reorderedFavorites.map((f) => f.id));
    } catch {
      setCategories(previousCategories);
      setErrorMessage("즐겨찾기 순서 변경에 실패했습니다.");
    }
  }

  return (
    <div className="mt-6">
      {errorMessage ? (
        <p role="alert" className="mb-4 text-sm text-danger">
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
        <SortableContext items={categories.map((c) => c.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <SortableCategoryCard key={category.id} category={category} />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeLabel ? (
            <div className="rounded-xl border border-accent bg-surface px-3 py-2 text-sm font-medium text-foreground shadow-lg">
              {activeLabel}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function SortableCategoryCard({ category }: { category: CategoryWithFavorites }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    data: { type: "category" } satisfies DragItemData,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`rounded-2xl border border-border bg-surface p-5 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            aria-label="카테고리 순서 변경"
            className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
          <h2 className="truncate text-base font-semibold text-foreground">{category.name}</h2>
        </div>
        <CategoryRowActions categoryId={category.id} currentName={category.name} />
      </div>

      <CreateFavoriteForm categoryId={category.id} />

      {category.favorites.length === 0 ? (
        <p className="mt-4 text-sm text-muted">즐겨찾기가 없습니다.</p>
      ) : (
        <SortableContext items={category.favorites.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <ul className="mt-4 divide-y divide-border">
            {category.favorites.map((favorite) => (
              <SortableFavoriteItem key={favorite.id} favorite={favorite} categoryId={category.id} />
            ))}
          </ul>
        </SortableContext>
      )}
    </section>
  );
}

function SortableFavoriteItem({
  favorite,
  categoryId,
}: {
  favorite: FavoriteSummary;
  categoryId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: favorite.id,
    data: { type: "favorite", categoryId } satisfies DragItemData,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between gap-2 py-2 ${isDragging ? "opacity-50" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="즐겨찾기 순서 변경"
          className="shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <a
          href={favorite.url}
          target="_blank"
          rel="noopener noreferrer"
          className="truncate text-sm font-medium text-foreground hover:underline"
        >
          {favorite.name}
        </a>
      </div>
      <FavoriteRowActions favoriteId={favorite.id} currentName={favorite.name} currentUrl={favorite.url} />
    </li>
  );
}
