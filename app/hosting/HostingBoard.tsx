"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { emptyHostingValues, type HostingSite } from "@/lib/hosting/fields";
import { HostingCard } from "./HostingCard";
import { HostingForm } from "./HostingForm";
import { createHostingSiteAction, reorderHostingSitesAction } from "./actions";
import { LEVEL_CLASSES, formatDday, siteExpiries } from "./expiry";

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

export function HostingBoard({ sites: initialSites, today }: { sites: HostingSite[]; today: string }) {
  const router = useRouter();
  const [sites, setSites] = useState(initialSites);
  const [isCreating, setIsCreating] = useState(false);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setSites(initialSites);
  }, [initialSites]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const expiries = useMemo(
    () => sites.flatMap((site) => siteExpiries(site, today)).sort((a, b) => a.daysLeft - b.daysLeft),
    [sites, today]
  );

  function handleDragStart(event: DragStartEvent) {
    const site = sites.find((s) => s.id === event.active.id);
    setActiveLabel(site?.values.siteName ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sites.findIndex((s) => s.id === active.id);
    const newIndex = sites.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previous = sites;
    const reordered = arrayMove(sites, oldIndex, newIndex);
    setSites(reordered);
    setErrorMessage(null);

    try {
      await reorderHostingSitesAction(reordered.map((s) => s.id));
    } catch {
      setSites(previous);
      setErrorMessage("순서 변경에 실패했습니다.");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {/* 만료 일정 요약 */}
      {expiries.length > 0 ? (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold text-foreground">만료 일정</h2>
          <p className="mt-0.5 text-xs text-muted">가까운 순서 · 30일 이내는 주황, 지난 항목은 빨강으로 표시됩니다.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {expiries.map((item) => (
              <li
                key={`${item.siteId}-${item.label}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <span className="font-medium text-foreground">{item.siteName}</span>
                  <span className="text-muted"> · {item.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted">{item.date.split("-").join(".")}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${LEVEL_CLASSES[item.level]}`}>
                    {formatDday(item.daysLeft)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {isCreating ? (
        <HostingForm
          initialValues={emptyHostingValues()}
          submitLabel="등록"
          onSubmit={async (values) => {
            await createHostingSiteAction(values);
            setIsCreating(false);
            router.refresh();
          }}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
        >
          + 새 홈페이지 추가
        </button>
      )}

      {sites.length === 0 ? (
        <p className="text-sm text-muted">등록된 홈페이지가 없습니다.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveLabel(null)}
        >
          <SortableContext items={sites.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid items-start gap-6 xl:grid-cols-2">
              {sites.map((site) => (
                <SortableHostingCard key={site.id} site={site} today={today} />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeLabel ? (
              <div className="rounded-2xl border border-accent bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-lg">
                {activeLabel}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

function SortableHostingCard({ site, today }: { site: HostingSite; today: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: site.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <HostingCard site={site} today={today} dragHandleProps={{ attributes, listeners }} />
    </div>
  );
}
