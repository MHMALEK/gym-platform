import type { DraggableAttributes } from "@dnd-kit/core";
import type { WorkoutBlockType, WorkoutLine } from "../../lib/workoutLineModel";

export type ExerciseOpt = { id: number; name: string; source: "catalog" | "mine" };

export type SaveStatus = "idle" | "saving" | "saved";

export type WorkoutItemsEditorProps = {
  mode: "training-plan" | "client";
  planId?: number;
  planVenue?: string | null;
  initialItems: WorkoutLine[];
  showSaveButton?: boolean;
  /**
   * When true, the editor renders without its own title/hint block —
   * just a compact toolbar with the advanced-fields toggle (and Save,
   * when applicable). Use on pages that already provide a page header.
   */
  hideHeader?: boolean;
  /**
   * When true, the inline "Add exercise" / "Add superset" buttons
   * underneath the items list are hidden — useful when the parent
   * page renders these in a sticky bar instead.
   */
  hideAddButtons?: boolean;
  /**
   * When true, the in-toolbar "Saving… / Saved" indicator is hidden.
   * Use when the parent page is rendering a combined status display
   * elsewhere (e.g. a sticky action bar covering items + form fields).
   */
  hideSaveIndicator?: boolean;
  /** Notifies the parent of items-side save activity. */
  onSaveStatusChange?: (status: SaveStatus) => void;
  onChange?: (items: WorkoutLine[]) => void;
};

/** Imperative handle exposed by `<WorkoutItemsEditor>` so a parent page
 *  can trigger the add flows from a sticky toolbar. */
export type WorkoutItemsEditorHandle = {
  openAddExercise: () => void;
  openAddGroup: () => void;
};

/**
 * Picker UI mode:
 *   - `append`: add a new exercise at the end of the list
 *   - `extendBlock`: add an exercise into an existing block
 *   - `groupSelect`: multi-select two or more exercises to create a new
 *     superset / circuit / tri-set / giant-set / dropset in one step
 */
export type PickerContext =
  | { mode: "append" }
  | { mode: "extendBlock"; afterIndex: number }
  | { mode: "groupSelect" };

export type RowPresentation = "exercise_head" | "set_under" | "legacy_combined";

export type DragHandleBag = {
  attributes: DraggableAttributes;
  listeners: Record<string, unknown> | undefined;
};

export type { WorkoutBlockType, WorkoutLine };
