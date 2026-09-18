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
import type { Partner } from "@/lib/partners/partnersStore";
import { PartnerCard } from "./PartnerCard";
import { CreatePartnerForm } from "./CreatePartnerForm";
import { reorderPartnersAction } from "./actions";

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

const CARD_GRID_STYLE = { gridTemplateColumns: "repeat(auto-fill, minmax(min(360px, 100%), 1fr))" };

export function PartnersBoard({ partners: initialPartners }: { partners: Partner[] }) {
  const [partners, setPartners] = useState(initialPartners);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPartners(initialPartners);
  }, [initialPartners]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragStart(event: DragStartEvent) {
    const partner = partners.find((p) => p.id === event.active.id);
    setActiveLabel(partner?.companyName ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveLabel(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = partners.findIndex((p) => p.id === active.id);
    const newIndex = partners.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousPartners = partners;
    const reordered = arrayMove(partners, oldIndex, newIndex);
    setPartners(reordered);
    setErrorMessage(null);

    try {
      await reorderPartnersAction(reordered.map((p) => p.id));
    } catch {
      setPartners(previousPartners);
      setErrorMessage("거래처 순서 변경에 실패했습니다.");
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {errorMessage ? (
        <p role="alert" className="text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <CreatePartnerForm />

      {partners.length === 0 ? (
        <p className="text-sm text-muted">등록된 거래처가 없습니다.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveLabel(null)}
        >
          <SortableContext items={partners.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid gap-6" style={CARD_GRID_STYLE}>
              {partners.map((partner) => (
                <SortablePartnerCard key={partner.id} partner={partner} />
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

function SortablePartnerCard({ partner }: { partner: Partner }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: partner.id,
  });

  const style = { transform: CSS.Transform.toString(transform), transition };
  const dragHandleProps: DragHandleProps = { attributes, listeners };

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-50" : ""}>
      <PartnerCard partner={partner} dragHandleProps={dragHandleProps} />
    </div>
  );
}
