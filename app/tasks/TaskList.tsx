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
import { ChevronDown, GripVertical, Pencil, Search, Trash2, X } from "lucide-react";
import type { GeneralTask, TaskNote } from "@/lib/tasks/tasksStore";
import {
  daysBetweenISO,
  formatMonthDayWeekday,
  formatNoteTimestamp,
  formatShortDate,
  getKstDateFromISO,
  getKstTodayISO,
} from "@/lib/tasks/week";
import {
  setTaskCompletionAction,
  deleteTaskAction,
  updateTaskAction,
  reorderTasksAction,
  addTaskNoteAction,
  updateTaskNoteAction,
  deleteTaskNoteAction,
} from "./actions";

const CARD_GRID_BASE = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
/** 이 일수 이상 진행 메모가 없으면 정체된 업무로 표시한다. */
const STALE_DAYS = 7;
/** 카드에 펼쳐 보여줄 최근 메모 개수. 나머지는 접는다. */
const VISIBLE_NOTES = 3;

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
  const [query, setQuery] = useState("");
  const [isCompletedOpen, setIsCompletedOpen] = useState(false);

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

  function handleNoteUpdated(taskId: string, note: TaskNote) {
    const pending = pendingAddedNotes.current.get(note.id);
    if (pending) pendingAddedNotes.current.set(note.id, { ...pending, note });
    patchNotes(taskId, (notes) => notes.map((n) => (n.id === note.id ? note : n)));
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

  // 업무명·진행상황·진행 메모를 한 번에 훑는 검색. 데이터가 이미 전부 내려와 있어
  // 서버를 다시 부르지 않고 바로 거른다.
  const keyword = query.trim().toLowerCase();
  const isSearching = keyword.length > 0;
  const matches = (task: GeneralTask) =>
    !isSearching ||
    [task.name, task.memo ?? "", ...task.notes.map((note) => note.body)]
      .join("\n")
      .toLowerCase()
      .includes(keyword);

  const visibleIncomplete = incomplete.filter(matches);
  const visibleCompleted = completed.filter(matches);
  // 검색 중에는 완료된 업무에서도 찾아야 하므로 접힘을 무시하고 펼친다.
  const showCompleted = isSearching || isCompletedOpen;

  return (
    <div className="mt-4">
      {errorMessage ? (
        <p role="alert" className="mb-4 mt-2 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="업무명·진행상황·메모 검색"
            aria-label="업무 검색"
            className="w-full min-w-0 rounded-lg border border-border bg-surface py-1.5 pl-8 pr-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
        {isSearching ? (
          <>
            <span className="text-xs text-muted">
              미완료 {visibleIncomplete.length}건 · 완료 {visibleCompleted.length}건
            </span>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-md border border-border px-2 py-1 text-xs text-muted hover:text-foreground"
            >
              검색 해제
            </button>
          </>
        ) : null}
      </div>

      {visibleIncomplete.length === 0 ? (
        <p className="text-sm text-muted">
          {isSearching ? "검색 결과가 없습니다." : "할 일이 없습니다."}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={(event) => setDraggingId(String(event.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggingId(null)}
        >
          <SortableContext items={visibleIncomplete.map((t) => t.id)} strategy={rectSortingStrategy}>
            <div className={CARD_GRID_BASE}>
              {visibleIncomplete.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onToggle={(next) => handleToggle(task, next)}
                  onDelete={() => handleDelete(task)}
                  onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
                  onNoteAdded={(note) => handleNoteAdded(task.id, note)}
                  onNoteUpdated={(note) => handleNoteUpdated(task.id, note)}
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

      {visibleCompleted.length > 0 ? (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setIsCompletedOpen((prev) => !prev)}
            aria-expanded={showCompleted}
            className="flex items-center gap-1 rounded-md text-sm font-medium text-muted hover:text-foreground"
          >
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform ${showCompleted ? "" : "-rotate-90"}`}
            />
            완료됨 {visibleCompleted.length}건
          </button>
          {showCompleted ? (
          <div className={`mt-2 ${CARD_GRID_BASE}`}>
            {visibleCompleted.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={(next) => handleToggle(task, next)}
                onDelete={() => handleDelete(task)}
                onSaved={(name, memo, taskDate) => handleSaved(task.id, name, memo, taskDate)}
                onNoteAdded={(note) => handleNoteAdded(task.id, note)}
                onNoteUpdated={(note) => handleNoteUpdated(task.id, note)}
                onNoteDeleted={(noteId) => handleNoteDeleted(task.id, noteId)}
              />
            ))}
          </div>
          ) : null}
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
  onNoteUpdated: (note: TaskNote) => void;
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
  onNoteUpdated,
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

  // 시작일은 금방 과거가 되므로, 실제로 궁금한 "마지막으로 손댄 날"을 함께 보여준다.
  // 완료된 업무는 더 손댈 일이 없으니 정체 표시를 하지 않는다.
  const lastNoteDate = task.notes.length > 0 ? getKstDateFromISO(task.notes[task.notes.length - 1].createdAt) : null;
  const daysSinceLastNote = lastNoteDate ? daysBetweenISO(lastNoteDate, getKstTodayISO()) : 0;
  const isStale = !task.isCompleted && daysSinceLastNote >= STALE_DAYS;

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
          <span className="shrink-0 text-xs text-highlight-muted">{formatMonthDayWeekday(task.taskDate)}</span>
          {lastNoteDate ? (
            <span
              title={`최근 진행 메모 ${formatMonthDayWeekday(lastNoteDate)}`}
              className={`min-w-0 truncate rounded-full px-1.5 py-0.5 text-[0.61rem] ${
                isStale
                  ? "bg-danger-bg text-danger"
                  : "bg-surface-highlight-soft text-highlight-muted"
              }`}
            >
              최근 {formatShortDate(lastNoteDate)}
              {isStale ? ` · ${daysSinceLastNote}일째` : ""}
            </span>
          ) : null}
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
        onNoteUpdated={onNoteUpdated}
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
  onNoteUpdated,
  onNoteDeleted,
}: {
  taskId: string;
  notes: TaskNote[];
  onNoteAdded: (note: TaskNote) => void;
  onNoteUpdated: (note: TaskNote) => void;
  onNoteDeleted: (noteId: string) => void;
}) {
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 최신 메모가 가장 중요하므로 위로 올리고, 오래된 메모는 접어둔다.
  const newestFirst = [...notes].reverse();
  const visibleNotes = isExpanded ? newestFirst : newestFirst.slice(0, VISIBLE_NOTES);
  const hiddenCount = newestFirst.length - visibleNotes.length;

  async function submitDraft() {
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

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitDraft();
        }}
        className="flex items-end gap-1.5"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            // 하루에도 여러 번 쓰는 입력이라 손을 떼지 않고 보낼 수 있게 한다.
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void submitDraft();
            }
          }}
          placeholder="진행 메모 추가 (Ctrl+Enter)"
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

      {visibleNotes.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {visibleNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              onUpdated={onNoteUpdated}
              onDelete={() => handleDelete(note.id)}
              onError={setError}
            />
          ))}
        </ul>
      ) : null}

      {hiddenCount > 0 || isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="self-start rounded px-1 text-xs text-highlight-muted hover:text-highlight-foreground"
        >
          {isExpanded ? "메모 접기" : `이전 메모 ${hiddenCount}개 더 보기`}
        </button>
      ) : null}

      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function NoteItem({
  note,
  onUpdated,
  onDelete,
  onError,
}: {
  note: TaskNote;
  onUpdated: (note: TaskNote) => void;
  onDelete: () => void;
  onError: (message: string | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    const body = draft.trim();
    if (!body || isSaving) return;

    onError(null);
    setIsSaving(true);
    try {
      const updated = await updateTaskNoteAction(note.id, body);
      onUpdated(updated);
      setIsEditing(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : "메모 수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-1 rounded-lg bg-surface-highlight-soft px-2 py-1.5 text-xs">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              void handleSave();
            }
          }}
          aria-label="진행 메모 수정"
          rows={2}
          className="w-full min-w-0 resize-y rounded-md border border-highlight-line bg-surface-highlight px-2 py-1 text-xs text-highlight-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !draft.trim()}
            className="rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDraft(note.body);
              setIsEditing(false);
            }}
            className="rounded-md border border-highlight-line px-2 py-0.5 text-xs text-highlight-muted"
          >
            취소
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex flex-col gap-1 rounded-lg bg-surface-highlight-soft px-2 py-1.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-highlight-muted">{formatNoteTimestamp(note.createdAt)}</span>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={() => {
              setDraft(note.body);
              setIsEditing(true);
            }}
            aria-label="진행 메모 수정"
            className="rounded p-0.5 text-highlight-muted hover:text-highlight-foreground"
          >
            <Pencil size={11} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="진행 메모 삭제"
            className="rounded p-0.5 text-highlight-muted hover:text-danger"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <span className="whitespace-pre-wrap break-words text-highlight-foreground">{note.body}</span>
    </li>
  );
}
