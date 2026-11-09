"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  closestCenter,
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarPlus, Check, ChevronDown, FolderKanban, Pencil, Trash2, Undo2 } from "lucide-react";
import type { Project, ProjectKind, ProjectStep } from "@/lib/tasks/projects";
import { addDaysISO, formatShortDateWeekday, getMondayOfISO, getWeekdayIndex, WEEKDAY_LABELS } from "@/lib/tasks/week";
import { splitPastedLines } from "@/lib/tasks/pasteLines";
import { SectionHeader } from "./SectionHeader";
import {
  addProjectStepAction,
  addProjectStepsAction,
  createProjectAction,
  deleteProjectAction,
  setProjectCompletedAction,
  updateProjectAction,
} from "./projectActions";
import { deleteWorkItemAction, reorderWorkItemsAction, updateWorkItemAction } from "./workItemActions";

const KIND_LABELS: Record<ProjectKind, string> = {
  project: "프로젝트",
  ongoing: "상시 업무",
};
const DONE_PREVIEW = 15;

/** 한글 조합 중 Enter(글자 확정)는 무시한다. */
function isSubmitKey(e: KeyboardEvent) {
  return e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing;
}

let tempSeq = 0;

export function ProjectBoard({ projects: serverProjects, todayISO }: { projects: Project[]; todayISO: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState(serverProjects);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  /** 좁은 화면(목록 아래에 상세가 붙는 배치)에서는 고른 프로젝트 상세로 내려간다. */
  function selectProject(id: string) {
    setSelectedId(id);
    if (window.matchMedia?.("(max-width: 1023px)").matches) {
      requestAnimationFrame(() =>
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  }

  useEffect(() => setProjects(serverProjects), [serverProjects]);

  const active = projects.filter((p) => !p.isCompleted);
  const selected = projects.find((p) => p.id === selectedId) ?? active[0] ?? projects[0] ?? null;

  async function run(task: () => Promise<unknown>, rollback?: () => void) {
    setError(null);
    try {
      await task();
      router.refresh();
    } catch (e) {
      rollback?.();
      // 일부만 저장됐을 수 있으니 서버 상태로 다시 맞춘다.
      router.refresh();
      setError(e instanceof Error && e.message ? e.message : "저장에 실패했습니다.");
    }
  }

  function patchProject(id: string, updater: (p: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === id ? updater(p) : p)));
  }

  async function createProject(name: string) {
    await run(async () => {
      const id = await createProjectAction(name, "project");
      setSelectedId(id);
    });
  }

  return (
    <section>
      <SectionHeader icon={FolderKanban} title="프로젝트" />
      {error ? (
        <p role="alert" className="mb-3 text-ui-body text-danger">
          {error}
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <ProjectList
          projects={projects}
          selectedId={selected?.id ?? null}
          onSelect={selectProject}
          onCreate={createProject}
        />
        <div ref={detailRef} className="min-w-0 scroll-mt-20">
          {selected ? (
            <ProjectDetail
              key={selected.id}
              project={selected}
              todayISO={todayISO}
              run={run}
              patch={(updater) => patchProject(selected.id, updater)}
              snapshot={() => projects}
              restore={setProjects}
              onDeleted={() => {
                const deletedId = selected.id;
                setProjects((prev) => prev.filter((p) => p.id !== deletedId));
                setSelectedId(null);
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-ui-body text-muted">
              왼쪽에서 프로젝트를 추가하세요.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProjectList({
  projects,
  selectedId,
  onSelect,
  onCreate,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const running = projects.filter((p) => !p.isCompleted && p.kind === "project");
  const ongoing = projects.filter((p) => !p.isCompleted && p.kind === "ongoing");
  const completed = projects.filter((p) => p.isCompleted);

  return (
    <div className="flex flex-col self-start rounded-2xl border border-border bg-surface p-2 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <ListGroup title="진행 중" count={running.length}>
        {running.map((p) => (
          <ProjectRow key={p.id} project={p} isSelected={p.id === selectedId} onSelect={onSelect} />
        ))}
      </ListGroup>
      <ListGroup title="상시 업무" count={ongoing.length}>
        {ongoing.map((p) => (
          <ProjectRow key={p.id} project={p} isSelected={p.id === selectedId} onSelect={onSelect} />
        ))}
      </ListGroup>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (isSubmitKey(e) && name.trim()) {
            e.preventDefault();
            onCreate(name.trim());
            setName("");
          }
        }}
        placeholder="+ 새 프로젝트 (Enter)"
        aria-label="새 프로젝트 이름"
        className="mx-1 mt-2 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-ui-body text-foreground placeholder:text-muted hover:border-border focus:border-border focus:bg-bg focus:outline-none"
      />

      {completed.length > 0 ? (
        <div className="mt-2 border-t border-border pt-2">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            aria-expanded={showCompleted}
            className="flex items-center gap-1 px-2 py-1 text-ui-body font-medium text-muted hover:text-foreground"
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${showCompleted ? "" : "-rotate-90"}`}
              aria-hidden="true"
            />
            완료 {completed.length}
          </button>
          {showCompleted ? (
            <ul className="flex flex-col">
              {completed.map((p) => (
                <ProjectRow key={p.id} project={p} isSelected={p.id === selectedId} onSelect={onSelect} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ListGroup({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-2 pb-1 pt-1.5 text-ui-meta font-semibold text-muted">
        {title} <span className="font-normal">{count}</span>
      </p>
      {count > 0 ? <ul className="flex flex-col">{children}</ul> : null}
    </div>
  );
}

function ProjectRow({
  project,
  isSelected,
  onSelect,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const remaining = project.steps.length + project.scheduled.length;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(project.id)}
        aria-current={isSelected ? "true" : undefined}
        className={`relative flex w-full items-center gap-2 rounded-lg px-2 py-[0.45rem] text-left ${
          isSelected ? "bg-accent/10 text-accent" : "text-foreground hover:bg-bg"
        }`}
      >
        {isSelected ? (
          <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-accent" aria-hidden="true" />
        ) : null}
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            project.isCompleted ? "bg-slate-300" : project.kind === "ongoing" ? "bg-slate-400" : "bg-accent"
          }`}
          aria-hidden="true"
        />
        <span className={`min-w-0 flex-1 truncate text-ui-head ${isSelected ? "font-semibold" : "font-medium"}`}>
          {project.name}
        </span>
        {!project.isCompleted && project.kind === "project" && remaining > 0 ? (
          <span className="shrink-0 text-ui-meta text-muted">남은 {remaining}</span>
        ) : null}
        {project.lastDoneDate ? (
          <span className="shrink-0 text-ui-meta text-muted">{project.lastDoneDate.slice(5).replace("-", ".")}</span>
        ) : null}
      </button>
    </li>
  );
}

type RunFn = (task: () => Promise<unknown>, rollback?: () => void) => Promise<void>;

function ProjectDetail({
  project,
  todayISO,
  run,
  patch,
  snapshot,
  restore,
  onDeleted,
}: {
  project: Project;
  todayISO: string;
  run: RunFn;
  patch: (updater: (p: Project) => Project) => void;
  snapshot: () => Project[];
  restore: (projects: Project[]) => void;
  onDeleted: () => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [memo, setMemo] = useState(project.memo ?? "");
  const [stepDraft, setStepDraft] = useState("");
  const [showAllDone, setShowAllDone] = useState(false);

  // 날짜 정하기: 이번 주·다음 주 월~금을 요일 버튼으로 (그 밖의 날짜는 달력)
  const weekRows = useMemo(() => {
    const monday = getMondayOfISO(todayISO);
    const days = (start: string) => Array.from({ length: 5 }, (_, i) => addDaysISO(start, i));
    return [
      { label: "이번 주", dates: days(monday) },
      { label: "다음 주", dates: days(addDaysISO(monday, 7)) },
    ];
  }, [todayISO]);

  /** 화면을 먼저 바꾸고 저장한다. 실패하면 되돌린다. */
  function optimistic(updater: (p: Project) => Project, task: () => Promise<unknown>) {
    const before = snapshot();
    patch(updater);
    void run(task, () => restore(before));
  }

  function saveName() {
    const next = name.trim();
    setIsRenaming(false);
    if (!next || next === project.name) return setName(project.name);
    optimistic(
      (p) => ({ ...p, name: next }),
      () => updateProjectAction(project.id, { name: next }),
    );
  }

  function saveMemo() {
    setIsEditingMemo(false);
    const next = memo.trim();
    if (next === (project.memo ?? "")) return;
    optimistic(
      (p) => ({ ...p, memo: next || null }),
      () => updateProjectAction(project.id, { memo: next }),
    );
  }

  function setKind(kind: ProjectKind) {
    if (kind === project.kind) return;
    optimistic(
      (p) => ({ ...p, kind }),
      () => updateProjectAction(project.id, { kind }),
    );
  }

  function toggleCompleted() {
    const next = !project.isCompleted;
    optimistic(
      (p) => ({
        ...p,
        isCompleted: next,
        completedAt: next ? new Date().toISOString() : null,
      }),
      () => setProjectCompletedAction(project.id, next),
    );
  }

  function removeProject() {
    const total = project.steps.length + project.scheduled.length + project.done.length;
    const message =
      total > 0
        ? `"${project.name}" 프로젝트를 삭제할까요?\n\n` +
          `남은 단계 ${project.steps.length}건, 예정 ${project.scheduled.length}건, 한 일 ${project.done.length}건이 ` +
          `주간 업무·검색·CSV에서도 함께 지워지고 되돌릴 수 없습니다.\n\n` +
          `끝난 프로젝트라면 삭제 대신 "완료"를 누르면 기록이 남습니다.`
        : `"${project.name}" 프로젝트를 삭제할까요?`;
    if (!window.confirm(message)) return;
    const before = snapshot();
    onDeleted();
    void run(
      () => deleteProjectAction(project.id),
      () => restore(before),
    );
  }

  const stepSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
  );

  /** 남은 단계를 끌어서 순서 바꾸기 */
  function reorderSteps(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = project.steps.findIndex((s) => s.id === active.id);
    const to = project.steps.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(project.steps, from, to).map((s, index) => ({ ...s, sortOrder: index }));
    optimistic(
      (p) => ({ ...p, steps: next }),
      () => reorderWorkItemsAction(next.map((s) => s.id)),
    );
  }

  function addStep() {
    const body = stepDraft.trim();
    if (!body) return;
    setStepDraft("");
    const temp: ProjectStep = {
      id: `tmp-${++tempSeq}`,
      body,
      sortOrder: Number.MAX_SAFE_INTEGER,
      createdAt: new Date().toISOString(),
    };
    optimistic(
      (p) => ({ ...p, steps: [...p.steps, temp] }),
      () => addProjectStepAction(project.id, body),
    );
  }

  /** 여러 줄을 붙여넣으면(엑셀 "1. … 2. …" 칸 등) 한 줄씩 단계로 넣는다. 한 줄이면 평소처럼 붙여넣기. */
  function pasteSteps(text: string): boolean {
    const bodies = splitPastedLines(text);
    if (bodies.length < 2) return false;
    const now = new Date().toISOString();
    const temps: ProjectStep[] = bodies.map((body) => ({
      id: `tmp-${++tempSeq}`,
      body,
      sortOrder: Number.MAX_SAFE_INTEGER,
      createdAt: now,
    }));
    optimistic(
      (p) => ({ ...p, steps: [...p.steps, ...temps] }),
      () => addProjectStepsAction(project.id, bodies),
    );
    return true;
  }

  function scheduleStep(step: ProjectStep, date: string) {
    optimistic(
      (p) => ({
        ...p,
        steps: p.steps.filter((s) => s.id !== step.id),
        scheduled: [...p.scheduled, { id: step.id, date, body: step.body, status: "planned" as const }].sort((a, b) =>
          a.date.localeCompare(b.date),
        ),
      }),
      () => updateWorkItemAction(step.id, { date }),
    );
  }

  function completeStep(step: ProjectStep) {
    optimistic(
      (p) => ({
        ...p,
        steps: p.steps.filter((s) => s.id !== step.id),
        done: [
          {
            id: step.id,
            date: todayISO,
            body: step.body,
            status: "done" as const,
          },
          ...p.done,
        ],
        lastDoneDate: todayISO,
      }),
      () => updateWorkItemAction(step.id, { date: todayISO, status: "done" }),
    );
  }

  function renameStep(step: ProjectStep, body: string) {
    optimistic(
      (p) => ({
        ...p,
        steps: p.steps.map((s) => (s.id === step.id ? { ...s, body } : s)),
      }),
      () => updateWorkItemAction(step.id, { body }),
    );
  }

  function deleteStep(step: ProjectStep) {
    optimistic(
      (p) => ({ ...p, steps: p.steps.filter((s) => s.id !== step.id) }),
      () => deleteWorkItemAction(step.id),
    );
  }

  function unschedule(entryId: string) {
    const entry = project.scheduled.find((e) => e.id === entryId);
    if (!entry) return;
    optimistic(
      (p) => ({
        ...p,
        scheduled: p.scheduled.filter((e) => e.id !== entryId),
        steps: [
          ...p.steps,
          {
            id: entry.id,
            body: entry.body,
            sortOrder: Number.MAX_SAFE_INTEGER,
            createdAt: new Date().toISOString(),
          },
        ],
      }),
      () => updateWorkItemAction(entryId, { date: null }),
    );
  }

  const doneShown = showAllDone ? project.done : project.done.slice(0, DONE_PREVIEW);

  return (
    <div className="min-w-0 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {/* 머리: 이름 · 종류 · 완료/삭제 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-accent/15 pb-3">
        {isRenaming ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (isSubmitKey(e)) saveName();
              if (e.key === "Escape") {
                setName(project.name);
                setIsRenaming(false);
              }
            }}
            autoFocus
            aria-label="프로젝트 이름"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-ui-title font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        ) : (
          <h3 className="group/name flex min-w-0 items-center gap-1.5 text-ui-title font-semibold text-foreground">
            <span className={`truncate ${project.isCompleted ? "text-muted line-through" : ""}`}>{project.name}</span>
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              aria-label="이름 수정"
              className="rounded p-1 text-muted opacity-0 hover:text-foreground focus:opacity-100 [@media(hover:none)]:opacity-100 group-hover/name:opacity-100"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </h3>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div role="radiogroup" aria-label="종류" className="flex rounded-lg border border-border p-0.5">
            {(Object.keys(KIND_LABELS) as ProjectKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={project.kind === kind}
                onClick={() => setKind(kind)}
                className={`rounded-md px-2.5 py-1 text-ui-meta font-medium ${
                  project.kind === kind ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground"
                }`}
              >
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleCompleted}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-ui-meta font-medium ${
              project.isCompleted
                ? "border-border text-muted hover:text-foreground"
                : "border-accent text-accent hover:bg-accent/10"
            }`}
          >
            {project.isCompleted ? (
              <>
                <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> 다시 진행
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" /> 완료
              </>
            )}
          </button>
          <button
            type="button"
            onClick={removeProject}
            aria-label="프로젝트 삭제"
            className="rounded-md p-1.5 text-danger hover:bg-bg"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 설명 */}
      {isEditingMemo ? (
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          onBlur={saveMemo}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setMemo(project.memo ?? "");
              setIsEditingMemo(false);
            }
          }}
          rows={3}
          autoFocus
          aria-label="설명"
          className="mt-3 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-ui-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditingMemo(true)}
          className="mt-3 block w-full whitespace-pre-wrap break-keep [overflow-wrap:anywhere] rounded-md border-l-2 border-accent/30 py-0.5 pl-2.5 text-left text-ui-body text-muted hover:bg-bg"
        >
          {project.memo || "설명 추가…"}
        </button>
      )}

      <div className="mt-5 grid gap-6 xl:grid-cols-2">
        <div className="flex flex-col gap-6">
          {/* 남은 단계 */}
          <Block title="남은 단계" count={project.steps.length} hint="날짜를 정하면 주간 업무에 계획으로 들어갑니다">
            <DndContext
              id={`project-steps-${project.id}`}
              sensors={stepSensors}
              collisionDetection={closestCenter}
              onDragEnd={reorderSteps}
            >
              <SortableContext items={project.steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <ul className="flex flex-col">
                  {project.steps.map((step) => (
                    <StepRow
                      key={step.id}
                      step={step}
                      weekRows={weekRows}
                      todayISO={todayISO}
                      onComplete={() => completeStep(step)}
                      onSchedule={(date) => scheduleStep(step, date)}
                      onRename={(body) => renameStep(step, body)}
                      onDelete={() => deleteStep(step)}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
            <input
              value={stepDraft}
              onChange={(e) => setStepDraft(e.target.value)}
              onKeyDown={(e) => {
                if (isSubmitKey(e)) {
                  e.preventDefault();
                  addStep();
                }
              }}
              onPaste={(e) => {
                if (pasteSteps(e.clipboardData.getData("text/plain"))) e.preventDefault();
              }}
              placeholder="+ 단계 추가 (Enter · 여러 줄 붙여넣기 가능)"
              aria-label="단계 추가"
              className="mt-1 w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-ui-body text-foreground placeholder:text-muted hover:border-border focus:border-border focus:bg-bg focus:outline-none"
            />
          </Block>

          {/* 예정 */}
          {project.scheduled.length > 0 ? (
            <Block title="예정" count={project.scheduled.length}>
              <ul className="flex flex-col">
                {project.scheduled.map((entry) => (
                  <li key={entry.id} className="group/entry flex items-start gap-3 rounded-md px-1 py-1 hover:bg-bg">
                    <span
                      className={`w-[4.2rem] shrink-0 text-ui-meta ${entry.date < todayISO ? "text-amber-600" : "text-muted"}`}
                    >
                      {formatShortDateWeekday(entry.date)}
                    </span>
                    <span className="min-w-0 flex-1 break-keep [overflow-wrap:anywhere] text-ui-body text-foreground">{entry.body}</span>
                    <button
                      type="button"
                      onClick={() => unschedule(entry.id)}
                      title="날짜 빼고 남은 단계로"
                      aria-label={`${entry.body} 날짜 빼기`}
                      className="shrink-0 rounded p-0.5 text-muted opacity-0 hover:text-foreground focus:opacity-100 [@media(hover:none)]:opacity-100 group-hover/entry:opacity-100"
                    >
                      <Undo2 className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </Block>
          ) : null}
        </div>

        {/* 지금까지 한 일 */}
        <Block title="지금까지 한 일" count={project.done.length}>
          {project.done.length === 0 ? (
            <p className="px-1 text-ui-body text-muted">
              아직 기록이 없습니다. 주간 업무에서 이 프로젝트를 골라 적으면 여기 쌓입니다.
            </p>
          ) : (
            <ul className="flex flex-col">
              {doneShown.map((entry, index) => {
                const showDate = index === 0 || doneShown[index - 1].date !== entry.date;
                return (
                  <li key={entry.id} className="flex items-start gap-3 px-1 py-[0.2rem]">
                    <span className="w-[4.2rem] shrink-0 text-ui-meta text-muted">
                      {showDate ? formatShortDateWeekday(entry.date) : ""}
                    </span>
                    <span className="min-w-0 flex-1 whitespace-pre-wrap break-keep [overflow-wrap:anywhere] text-ui-body text-foreground">
                      {entry.body}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {project.done.length > DONE_PREVIEW ? (
            <button
              type="button"
              onClick={() => setShowAllDone((v) => !v)}
              className="mt-1 px-1 text-ui-meta text-accent hover:underline"
            >
              {showAllDone ? "접기" : `전체 ${project.done.length}건 보기`}
            </button>
          ) : null}
        </Block>
      </div>
    </div>
  );
}

function Block({ title, count, hint, children }: { title: string; count: number; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5 border-b border-border pb-1.5">
        <h4 className="text-ui-head font-semibold text-foreground">{title}</h4>
        <span className="text-ui-meta text-muted">{count}</span>
        {hint ? <span className="ml-auto truncate text-ui-meta text-muted">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

function StepRow({
  step,
  weekRows,
  todayISO,
  onComplete,
  onSchedule,
  onRename,
  onDelete,
}: {
  step: ProjectStep;
  weekRows: { label: string; dates: string[] }[];
  todayISO: string;
  onComplete: () => void;
  onSchedule: (date: string) => void;
  onRename: (body: string) => void;
  onDelete: () => void;
}) {
  const [isPicking, setIsPicking] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [body, setBody] = useState(step.body);
  const [picked, setPicked] = useState("");
  const isTemp = step.id.startsWith("tmp-");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
    disabled: isTemp || isEditing || isPicking,
  });

  function closePicker() {
    setIsPicking(false);
    setPicked("");
  }

  function confirmPick() {
    if (!picked) return;
    onSchedule(picked);
    closePicker();
  }

  function saveBody() {
    setIsEditing(false);
    const next = body.trim();
    if (!next || next === step.body) return setBody(step.body);
    onRename(next);
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      role={undefined}
      tabIndex={-1}
      className={`group/step rounded-md px-1 py-[0.3rem] hover:bg-bg ${
        isEditing || isPicking ? "" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "relative z-10 bg-surface opacity-60 shadow" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onClick={onComplete}
          disabled={isTemp}
          aria-label={`${step.body} 오늘 한 일로 완료`}
          title="오늘 한 일로 완료"
          className="mt-[0.2rem] h-[0.85rem] w-[0.85rem] shrink-0 rounded border border-slate-300 hover:border-accent dark:border-slate-500"
        />
        {isEditing ? (
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onBlur={saveBody}
            onKeyDown={(e) => {
              if (isSubmitKey(e)) saveBody();
              if (e.key === "Escape") {
                setBody(step.body);
                setIsEditing(false);
              }
            }}
            autoFocus
            aria-label="단계 내용"
            className="min-w-0 flex-1 rounded border border-border bg-surface px-1.5 py-0.5 text-ui-body text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        ) : (
          <button
            type="button"
            onClick={() => !isTemp && setIsEditing(true)}
            className="min-w-0 flex-1 break-keep [overflow-wrap:anywhere] text-left text-ui-body text-foreground"
          >
            {step.body}
          </button>
        )}
        {!isTemp && !isEditing ? (
          <span className="flex shrink-0 items-center opacity-60 group-hover/step:opacity-100">
            <button
              type="button"
              onClick={() => (isPicking ? closePicker() : setIsPicking(true))}
              aria-expanded={isPicking}
              aria-label={`${step.body} 날짜 정하기`}
              title="날짜 정하기"
              className={`rounded p-0.5 ${isPicking ? "text-accent" : "text-muted hover:text-accent"}`}
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label={`${step.body} 삭제`}
              className="rounded p-0.5 text-muted opacity-0 hover:text-danger focus:opacity-100 [@media(hover:none)]:opacity-100 group-hover/step:opacity-100"
            >
              <Trash2 className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      {isPicking ? (
        <div className="ml-[1.35rem] mt-1.5 flex flex-col gap-1 rounded-lg border border-border bg-surface p-2">
          {weekRows.map((row) => (
            <div key={row.label} className="flex items-center gap-1">
              <span className="w-[2.6rem] shrink-0 text-ui-meta text-muted">{row.label}</span>
              {row.dates.map((date) => {
                const isSelected = date === picked;
                const isToday = date === todayISO;
                const isPast = date < todayISO;
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setPicked(isSelected ? "" : date)}
                    aria-pressed={isSelected}
                    aria-label={`${formatShortDateWeekday(date)} 선택`}
                    title={formatShortDateWeekday(date)}
                    className={`flex w-[2.4rem] flex-col items-center rounded-md border py-0.5 leading-tight ${
                      isSelected
                        ? "border-accent bg-accent text-white"
                        : isToday
                          ? "border-accent bg-accent/10 text-accent hover:border-accent"
                          : isPast
                            ? "border-border text-muted hover:border-accent hover:text-accent"
                            : "border-border text-foreground hover:border-accent hover:text-accent"
                    }`}
                  >
                    <span className="text-ui-meta font-semibold">{WEEKDAY_LABELS[getWeekdayIndex(date)]}</span>
                    <span className="text-ui-tiny opacity-70">{Number(date.slice(8, 10))}</span>
                  </button>
                );
              })}
            </div>
          ))}
          <label className="mt-0.5 flex items-center gap-1">
            <span className="w-[2.6rem] shrink-0 text-ui-meta text-muted">그 외</span>
            <input
              type="date"
              value={picked}
              aria-label="날짜 직접 선택"
              onChange={(e) => setPicked(e.target.value)}
              className="rounded-md border border-border bg-bg px-1.5 py-0.5 text-ui-meta text-foreground"
            />
          </label>
          <div className="mt-1 flex items-center justify-end gap-1.5 border-t border-border pt-1.5">
            <span className="mr-auto text-ui-meta text-muted">
              {picked ? `${formatShortDateWeekday(picked)}에 하기` : "날짜를 고르세요"}
            </span>
            <button
              type="button"
              onClick={closePicker}
              className="rounded-md px-2 py-0.5 text-ui-meta text-muted hover:text-foreground"
            >
              취소
            </button>
            <button
              type="button"
              onClick={confirmPick}
              disabled={!picked}
              className="rounded-md bg-accent px-2.5 py-0.5 text-ui-meta font-semibold text-white disabled:opacity-40"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
