"use client";

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DraggableAttributes,
  type DraggableSyntheticListeners,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil, Trash2, X } from "lucide-react";
import type { GeneralTask, TaskNote } from "@/lib/tasks/tasksStore";
import { formatMonthDayWeekday, formatNoteTimestamp } from "@/lib/tasks/week";
import {
  setTaskCompletionAction,
  deleteTaskAction,
  updateTaskAction,
  reorderTasksAction,
  addTaskNoteAction,
  deleteTaskNoteAction,
} from "./actions";

const CARD_GRID_BASE = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

/** 서버가 준 목록에, 아직 서버 응답에 반영되지 않은 로컬 메모 추가/삭제를 얹어준다. */
function withPendingNotes(
  serverTasks: GeneralTask[],
  addedNotes: Map<string, { taskId: string; note: TaskNote }>,
  removedNoteIds: Set<string>
): GeneralTask[] {
  if (addedNotes.size === 0 && removedNoteIds.size === 0) return serverTasks;

  return serverTasks.map((task) => {
    const kept = task.notes.filter((note) => !removedNoteIds.has(note.id));
    const extras = [...addedNotes.values()]
      .filter((pending) => pending.taskId === task.id)
      .map((pending) => pending.note);

    if (extras.length === 0 && kept.length === task.notes.length) return task;

    return {
      ...task,
      notes: [...kept, ...extras].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  });
}

type DragHandle = {
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners;
  isDragging: boolean;
};

export function TaskList({
  incomplete: initialIncomplete,
  completed: initialCompleted,
}: {
  incomplete: GeneralTask[];
  completed: GeneralTask[];
}) {
  const [incomplete, setIncomplete] = useState(initialIncomplete);
  const [completed, setCompleted] = useState(initialCompleted);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 서버 액션이 끝날 때마다 페이지가 다시 렌더링돼 새 목록(props)이 내려온다. 그런데 다른
  // 카드의 작업이 먼저 만들어 둔 "옛날 스냅샷"이 뒤늦게 도착하면, 방금 추가한 진행 메모가
  // 그 스냅샷에는 없어서 화면에서 사라져 버렸다. 서버가 아직 모르는 로컬 메모 변경을
  // 여기 담아두고, 서버 응답에 반영된 게 확인되면 스스로 비운다.
  const pendingAddedNotes = useRef(new Map<string, { taskId: string; note: TaskNote }>());
  const pendingRemovedNoteIds = useRef(new Set<string>());

  useEffect(() => {
    const serverNoteIds = new Set<string>();
    for (const task of [...initialIncomplete, ...initialCompleted]) {
      for (const note of task.notes) serverNoteIds.add(note.id);
    }

    for (const noteId of pendingAddedNotes.current.keys()) {
      if (serverNoteIds.has(noteId)) pendingAddedNotes.current.delete(noteId);
    }
    for (const noteId of pendingRemovedNoteIds.current) {
      if (!serverNoteIds.has(noteId)) pendingRemovedNoteIds.current.delete(noteId);
    }

    setIncomplete(withPendingNotes(initialIncomplete, pendingAddedNotes.current, pendingRemovedNoteIds.current));
    setCompleted(withPendingNotes(initialCompleted, pendingAddedNotes.current, pendingRemovedNoteIds.current));
  }, [initialIncomplete, initialCompleted]);

  async function handleToggle(task: GeneralTask, nextCompleted: boolean) {
    const previousIncomplete = incomplete;
    const previousCompleted = completed;

    if (nextCompleted) {
      setIncomplete((prev) => prev.filter((t) => t.id !== task.id));
      setCompleted((prev) => [{ ...task, isCompleted: true, completedAt: new Date().toISOString() }, ...prev]);
    } else {
      setCompleted((prev) => prev.filter((t) => t.id !== task.id));
      setIncomplete((prev) => [...prev, { ...task, isCompleted: false, completedAt: null }]);
    }
    setErrorMessage(null);

    try {
      await setTaskCompletionAction(task.id, nextCompleted);
    } catch {
      setIncomplete(previousIncomplete);
      setCompleted(previousCompleted);
      setErrorMessage("완료 처리에 실패했습니다.");
    }
  }

  async function handleDelete(task: GeneralTask) {
    const previousIncomplete = incomplete;
    const previousCompleted = completed;
    setIncomplete((prev) => prev.filter((t) => t.id !== task.id));
    setCompleted((prev) => prev.filter((t) => t.id !== task.id));
    setErrorMessage(null);

    try {
      await deleteTaskAction(task.id);
    } catch {
      setIncomplete(previousIncomplete);
      setCompleted(previousCompleted);
      setErrorMessage("삭제에 실패했습니다.");
    }
  }

  function handleSaved(id: string, name: string, memo: string | null, taskDate: string) {
    setIncomplete((prev) => prev.map((t) => (t.id === id ? { ...t, name, memo, taskDate } : t)));
    setCompleted((prev) => prev.map((t) => (t.id === id ? { ...t, name, memo, taskDate } : t)));
  }

  function patchNotes(id: string, updater: (notes: TaskNote[]) => TaskNote[]) {
    const apply = (list: GeneralTask[]) =>
      list.map((t) => (t.id === id ? { ...t, notes: updater(t.notes) } : t));
    setIncomplete(apply);
    setCompleted(apply);
  }

  function handleNoteAdded(taskId: string, note: TaskNote) {
    pendingAddedNotes.current.set(note.id, { taskId, note });
    pendingRemovedNoteIds.current.delete(note.id);
    patchNotes(taskId, (notes) => [...notes, note]);
  }

  function handleNoteDeleted(taskId: string, noteId: string) {
    pendingRemovedNoteIds.current.add(noteId);
    pendingAddedNotes.current.delete(noteId);
    patchNotes(taskId, (notes) => notes.filter((n) => n.id !== noteId));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);

  async function handleDragEnd(event: DragEndEvent) {
    setDraggingId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = incomplete.findIndex((t) => t.id === active.id);
    const newIndex = incomplete.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const previousIncomplete = incomplete;
    const reordered = arrayMove(incomplete, oldIndex, newIndex);
    setIncomplete(reordered);
    setErrorMessage(null);

    try {
      await reorderTasksAction(reordered.map((t) => t.id));
    } catch {
      setIncomplete(previousIncomplete);
      setErrorMessage("업무 순서 변경에 실패했습니다.");
    }
  }

  const draggingTask = draggingId ? incomplete.find((t) => t.id === draggingId) : null;

  return (
    <div className="mt-4">
      {errorMessage ? (
        <p role="alert" className="mb-4 mt-2 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      {incomplete.length === 0 ? (
        <p className="text-sm text-muted">할 일이 없습니다.</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setDraggingId(String(event.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <SortableContext items={incomplete.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className={CARD_GRID_BASE}>
              {incomplete.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onToggle={(next) => handleToggle(task, next)}
                  onDelete={() => handleDelete(task)}
                  onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
                  onNoteAdded={(note) => handleNoteAdded(task.id, note)}
                  onNoteDeleted={(noteId) => handleNoteDeleted(task.id, noteId)}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggingTask ? (
              <div className="rounded-2xl border border-accent bg-surface-highlight p-4 text-sm font-medium text-highlight-foreground shadow-lg">
                {draggingTask.name}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {completed.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-muted">완료됨</h3>
          <div className={`mt-2 ${CARD_GRID_BASE}`}>
            {completed.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(next) => handleToggle(task, next)}
                onDelete={() => handleDelete(task)}
                onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
                onNoteAdded={(note) => handleNoteAdded(task.id, note)}
                onNoteDeleted={(noteId) => handleNoteDeleted(task.id, noteId)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type TaskCardProps = {
  task: GeneralTask;
  onToggle: (next: boolean) => void;
  onDelete: () => void;
  onSaved: (name: string, memo: string | null, taskDate: string) => void;
  onNoteAdded: (note: TaskNote) => void;
  onNoteDeleted: (noteId: string) => void;
};

/** 미완료 목록 전용 — 드래그로 순서를 바꿀 수 있는 카드. */
function SortableTaskCard(props: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.task.id,
  });

  return (
    <TaskCard
      {...props}
      dragHandle={{
        setNodeRef,
        style: { transform: CSS.Transform.toString(transform), transition },
        attributes,
        listeners,
        isDragging,
      }}
    />
  );
}

function TaskCard({
  task,
  onToggle,
  onDelete,
  onSaved,
  onNoteAdded,
  onNoteDeleted,
  dragHandle,
}: TaskCardProps & { dragHandle?: DragHandle }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editMemo, setEditMemo] = useState(task.memo ?? "");
  const [editDate, setEditDate] = useState(task.taskDate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCheckboxChange() {
    setIsToggling(true);
    await Promise.resolve(onToggle(!task.isCompleted));
    setIsToggling(false);
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const trimmedMemo = editMemo.trim();
      await updateTaskAction({ id: task.id, name: editName, memo: trimmedMemo, taskDate: editDate });
      onSaved(editName.trim(), trimmedMemo || null, editDate);
      setIsEditing(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteClick() {
    setIsDeleting(true);
    onDelete();
  }

  if (isEditing) {
    return (
      <div
        ref={dragHandle?.setNodeRef}
        style={dragHandle?.style}
        className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface-highlight p-4"
      >
        <input
          type="date"
          value={editDate}
          onChange={(e) => setEditDate(e.target.value)}
          aria-label="날짜"
          className="w-full min-w-0 rounded-lg border border-highlight-line bg-surface-highlight-soft px-2 py-1 text-sm text-highlight-foreground"
        />
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          aria-label="업무 이름"
          className="w-full min-w-0 rounded-lg border border-highlight-line bg-surface-highlight-soft px-2 py-1 text-sm text-highlight-foreground"
        />
        <textarea
          value={editMemo}
          onChange={(e) => setEditMemo(e.target.value)}
          placeholder="진행상황 (선택)"
          aria-label="진행상황"
          rows={3}
          className="w-full min-w-0 rounded-lg border border-highlight-line bg-surface-highlight-soft px-2 py-1 text-sm text-highlight-foreground"
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editName.trim() || !editDate}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditName(task.name);
              setEditMemo(task.memo ?? "");
              setEditDate(task.taskDate);
              setErrorMessage(null);
              setIsEditing(false);
            }}
            className="rounded-md border border-highlight-line px-2 py-1 text-xs text-highlight-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={dragHandle?.setNodeRef}
      style={dragHandle?.style}
      className={`flex flex-col gap-2 rounded-2xl border border-highlight-line bg-surface-highlight p-4 ${
        dragHandle?.isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {dragHandle ? (
            <button
              type="button"
              aria-label={`${task.name} 순서 변경`}
              className="shrink-0 cursor-grab touch-none rounded-md p-1 text-highlight-muted hover:bg-surface-highlight-soft active:cursor-grabbing"
              {...dragHandle.attributes}
              {...dragHandle.listeners}
            >
              <GripVertical size={14} />
            </button>
          ) : null}
          <span className="text-xs text-highlight-muted">{formatMonthDayWeekday(task.taskDate)}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${task.name} 수정`}
            className="rounded-md p-1 text-highlight-muted hover:bg-surface-highlight-soft hover:text-highlight-foreground"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            aria-label={`${task.name} 삭제`}
            className="rounded-md p-1 text-danger hover:bg-surface-highlight-soft disabled:opacity-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <label className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={task.isCompleted}
          onChange={handleCheckboxChange}
          disabled={isToggling}
          aria-label={`${task.name} 완료`}
          className="mt-1"
        />
        <span
          className={`min-w-0 break-words text-sm font-medium ${
            task.isCompleted ? "text-highlight-muted line-through" : "text-highlight-foreground"
          }`}
        >
          {task.name}
        </span>
      </label>

      <div
        className={`min-h-[3rem] whitespace-pre-wrap break-words rounded-lg bg-surface-highlight-soft p-2 text-xs text-highlight-muted ${
          task.isCompleted ? "line-through" : ""
        }`}
      >
        {task.memo || "진행상황 없음"}
      </div>

      <TaskNotes
        taskId={task.id}
        notes={task.notes}
        onNoteAdded={onNoteAdded}
        onNoteDeleted={onNoteDeleted}
      />

      {task.completedAt ? (
        <span className="text-xs text-highlight-muted">완료 {formatMonthDayWeekday(task.completedAt.slice(0, 10))}</span>
      ) : null}
    </div>
  );
}

function TaskNotes({
  taskId,
  notes,
  onNoteAdded,
  onNoteDeleted,
}: {
  taskId: string;
  notes: TaskNote[];
  onNoteAdded: (note: TaskNote) => void;
  onNoteDeleted: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || isAdding) return;

    setError(null);
    setIsAdding(true);
    try {
      const note = await addTaskNoteAction(taskId, body);
      onNoteAdded(note);
      setDraft("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "메모 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDelete(noteId: string) {
    setError(null);
    try {
      await deleteTaskNoteAction(noteId);
      onNoteDeleted(noteId);
    } catch {
      setError("메모 삭제에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-highlight-muted">진행 메모</p>

      {notes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {notes.map((note) => (
            <li key={note.id} className="group flex flex-col gap-1 rounded-lg bg-surface-highlight-soft px-2 py-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-highlight-muted">{formatNoteTimestamp(note.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  aria-label="진행 메모 삭제"
                  className="shrink-0 rounded p-0.5 text-highlight-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
              <span className="whitespace-pre-wrap break-words text-highlight-foreground">{note.body}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={handleAdd} className="flex items-end gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="진행 메모 추가"
          aria-label="진행 메모 추가"
          rows={2}
          className="min-w-0 flex-1 resize-y rounded-lg border border-highlight-line bg-surface-highlight-soft px-2 py-1 text-xs text-highlight-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={isAdding || !draft.trim()}
          className="shrink-0 rounded-md border border-highlight-line px-2 py-1 text-xs font-medium text-highlight-foreground hover:bg-surface-highlight-soft disabled:opacity-50"
        >
          {isAdding ? "..." : "추가"}
        </button>
      </form>

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
