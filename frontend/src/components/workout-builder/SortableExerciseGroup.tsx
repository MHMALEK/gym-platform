import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

import { mergeIntoDroppableId } from "./constants";
import type { DragHandleBag } from "./types";

/**
 * One sortable item = whole exercise (head + sets); drag handle lives on the
 * head row only. The same DOM node is also a merge-droppable, so dropping
 * anywhere on the card hits "group here", not only the title.
 */
export function SortableExerciseGroup({
  headLocalId,
  shellStyle,
  mergeDropEnabled,
  activeDragHeadId,
  children,
}: {
  headLocalId: string;
  shellStyle: CSSProperties;
  /** While dragging another exercise, enables merge target on this whole card. */
  mergeDropEnabled: boolean;
  activeDragHeadId: string | null;
  children: (handle: DragHandleBag) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef: setSortableRef, transform, transition, isDragging } =
    useSortable({
      id: headLocalId,
      transition: null,
      animateLayoutChanges: () => false,
    });
  const { setNodeRef: setMergeRef, isOver: mergeDropOver } = useDroppable({
    id: mergeIntoDroppableId(headLocalId),
    disabled: !mergeDropEnabled || activeDragHeadId === headLocalId,
  });
  const setCardRef = (el: HTMLDivElement | null) => {
    setSortableRef(el);
    setMergeRef(el);
  };
  const ring = isDragging
    ? "none"
    : mergeDropEnabled && mergeDropOver
      ? "0 0 0 2px var(--app-accent), 0 8px 24px rgba(0,0,0,0.1)"
      : mergeDropEnabled
        ? "0 0 0 1px dashed color-mix(in srgb, var(--app-accent) 45%, var(--app-border))"
        : "0 0 0 1px var(--app-border), 0 2px 8px rgba(0,0,0,0.04)";

  return (
    <div
      ref={setCardRef}
      style={{
        ...shellStyle,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.38 : 1,
        boxShadow: ring,
      }}
    >
      {children({ attributes, listeners: listeners as Record<string, unknown> | undefined })}
    </div>
  );
}
