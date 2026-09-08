import { describe, it, expect, vi, beforeEach } from "vitest";

type QueryResult = { data?: unknown; error?: { message: string } | null };

function makeQuery(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.is = vi.fn(chain);
  builder.not = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.then = (resolve: (value: QueryResult) => void, reject?: (reason: unknown) => void) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

const fromMock = vi.fn();

function queueResult(result: QueryResult) {
  fromMock.mockImplementationOnce(() => makeQuery(result));
}

vi.mock("@/lib/supabase/serviceClient", () => ({
  createSupabaseServiceClient: () => ({ from: fromMock }),
}));

import {
  getBoard,
  createTemplate,
  renameTemplate,
  archiveTemplate,
  createTask,
  updateTask,
  setTaskCompletion,
  deleteTask,
} from "./tasksStore";

describe("tasksStore", () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  describe("getBoard", () => {
    it("고정 업무가 이미 이번 주에 생성돼 있으면 새로 만들지 않고 카드 형태로 반환한다", async () => {
      queueResult({
        data: [{ id: "tpl-1", name: "주간업무일지 제출", weekday: 3, sort_order: 0 }],
        error: null,
      }); // templates
      queueResult({ data: [{ template_id: "tpl-1" }], error: null }); // existing check → 이미 있음
      queueResult({
        data: [
          { id: "task-1", template_id: "tpl-1", name: "주간업무일지 제출", weekday: 3, is_completed: false },
        ],
        error: null,
      }); // fixed rows
      queueResult({ data: [], error: null }); // general rows

      const result = await getBoard();

      expect(fromMock).toHaveBeenCalledTimes(4); // insert를 건너뛰어야 함
      expect(result.fixedTasks).toEqual([
        { taskId: "task-1", templateId: "tpl-1", name: "주간업무일지 제출", weekday: 3, isCompleted: false },
      ]);
      expect(result.incomplete).toEqual([]);
      expect(result.completed).toEqual([]);
    });

    it("보관된 템플릿의 잔여 인스턴스는 카드에서 제외한다", async () => {
      queueResult({
        data: [{ id: "tpl-1", name: "월요 보고", weekday: 0, sort_order: 0 }],
        error: null,
      }); // templates (tpl-2 는 보관돼 목록에 없음)
      queueResult({ data: [{ template_id: "tpl-1" }], error: null }); // existing check
      queueResult({
        data: [
          { id: "task-1", template_id: "tpl-1", name: "월요 보고", weekday: 0, is_completed: false },
          { id: "task-2", template_id: "tpl-2", name: "삭제된 업무", weekday: 0, is_completed: false },
        ],
        error: null,
      }); // fixed rows — tpl-2 인스턴스가 남아있음
      queueResult({ data: [], error: null }); // general rows

      const result = await getBoard();

      expect(result.fixedTasks).toEqual([
        { taskId: "task-1", templateId: "tpl-1", name: "월요 보고", weekday: 0, isCompleted: false },
      ]);
    });

    it("이번 주에 없는 고정 업무는 자동으로 생성한다", async () => {
      queueResult({
        data: [{ id: "tpl-1", name: "주간업무일지 제출", weekday: 3, sort_order: 0 }],
        error: null,
      }); // templates
      queueResult({ data: [], error: null }); // existing check → 없음
      queueResult({ error: null }); // insert
      queueResult({ data: [], error: null }); // fixed rows
      queueResult({ data: [], error: null }); // general rows

      await getBoard();

      expect(fromMock).toHaveBeenCalledTimes(5);
    });

    it("일반 업무는 등록일을 포함해서 완료 전까지 계속 노출된다", async () => {
      queueResult({ data: [], error: null }); // templates
      queueResult({ data: [], error: null }); // fixed rows
      queueResult({
        data: [
          {
            id: "task-old",
            name: "오래된 디자인 작업",
            memo: "2차 시안 대기",
            task_date: "2026-08-10",
            is_completed: false,
            completed_at: null,
            sort_order: 5,
            created_at: "2026-08-10T00:00:00.000Z",
          },
        ],
        error: null,
      }); // general rows

      const result = await getBoard();

      expect(result.incomplete).toEqual([
        {
          id: "task-old",
          name: "오래된 디자인 작업",
          memo: "2차 시안 대기",
          taskDate: "2026-08-10",
          isCompleted: false,
          completedAt: null,
          createdAt: "2026-08-10T00:00:00.000Z",
          sortOrder: 5,
        },
      ]);
    });

    it("task_date 컬럼 도입 이전에 만들어져 값이 null인 행은 생성일로 대체하고, 정렬에서도 죽지 않는다", async () => {
      queueResult({ data: [], error: null }); // templates
      queueResult({ data: [], error: null }); // fixed rows
      queueResult({
        data: [
          {
            id: "task-legacy",
            name: "마이그레이션 이전 업무",
            memo: null,
            task_date: null,
            is_completed: false,
            completed_at: null,
            sort_order: 0,
            created_at: "2026-09-04T07:19:56.250Z",
          },
        ],
        error: null,
      }); // general rows

      const result = await getBoard();

      expect(result.incomplete).toEqual([
        expect.objectContaining({ id: "task-legacy", taskDate: "2026-09-04" }),
      ]);
    });

    it("미완료 업무는 사용자가 지정한 날짜(taskDate) 기준으로 오름차순 정렬한다", async () => {
      queueResult({ data: [], error: null }); // templates
      queueResult({ data: [], error: null }); // fixed rows
      queueResult({
        data: [
          {
            id: "task-later",
            name: "나중 날짜",
            memo: null,
            task_date: "2026-09-10",
            is_completed: false,
            completed_at: null,
            sort_order: 0,
            created_at: "2026-09-01T00:00:00.000Z",
          },
          {
            id: "task-earlier",
            name: "이른 날짜",
            memo: null,
            task_date: "2026-09-01",
            is_completed: false,
            completed_at: null,
            sort_order: 0,
            created_at: "2026-09-01T00:00:00.000Z",
          },
        ],
        error: null,
      }); // general rows

      const result = await getBoard();

      expect(result.incomplete.map((t) => t.id)).toEqual(["task-earlier", "task-later"]);
    });

    it("주가 바뀌어도 이전에 완료한 일반 업무를 계속 완료 목록에 보여준다", async () => {
      queueResult({ data: [], error: null }); // templates
      queueResult({ data: [], error: null }); // fixed rows
      queueResult({
        data: [
          {
            id: "task-a",
            name: "지난주 완료",
            memo: null,
            task_date: "2026-08-15",
            is_completed: true,
            completed_at: "2026-08-20T10:00:00.000Z",
            sort_order: 0,
            created_at: "2026-08-15T00:00:00.000Z",
          },
          {
            id: "task-b",
            name: "이번주 완료",
            memo: null,
            task_date: "2026-08-30",
            is_completed: true,
            completed_at: "2026-09-02T10:00:00.000Z",
            sort_order: 0,
            created_at: "2026-08-30T00:00:00.000Z",
          },
        ],
        error: null,
      }); // general rows

      const result = await getBoard();

      expect(result.completed.map((t) => t.id)).toEqual(["task-b", "task-a"]);
    });

    it("고정 업무 카드는 요일순으로 정렬한다", async () => {
      queueResult({
        data: [
          { id: "tpl-1", name: "월요 보고", weekday: 0, sort_order: 0 },
          { id: "tpl-2", name: "금요 정산", weekday: 4, sort_order: 0 },
        ],
        error: null,
      }); // templates
      queueResult({ data: [{ template_id: "tpl-1" }, { template_id: "tpl-2" }], error: null }); // existing check
      queueResult({
        data: [
          { id: "f-fri", template_id: "tpl-2", name: "금요 정산", weekday: 4, is_completed: false },
          { id: "f-mon", template_id: "tpl-1", name: "월요 보고", weekday: 0, is_completed: false },
        ],
        error: null,
      }); // fixed rows
      queueResult({ data: [], error: null }); // general rows

      const result = await getBoard();

      expect(result.fixedTasks.map((t) => t.taskId)).toEqual(["f-mon", "f-fri"]);
    });

    it("고정 업무 조회가 실패하면 에러를 던진다", async () => {
      queueResult({ data: null, error: { message: "db down" } });

      await expect(getBoard()).rejects.toThrow("db down");
    });
  });

  describe("createTemplate", () => {
    it("고정 업무를 생성한다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await createTemplate("주간업무일지 제출", 3);

      expect(fromMock).toHaveBeenCalledWith("task_templates");
      expect(query.insert).toHaveBeenCalledWith({ name: "주간업무일지 제출", weekday: 3 });
    });
  });

  describe("renameTemplate", () => {
    it("이름과 요일을 수정한다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await renameTemplate("tpl-1", "새 이름", 5);

      expect(query.update).toHaveBeenCalledWith({ name: "새 이름", weekday: 5 });
      expect(query.eq).toHaveBeenCalledWith("id", "tpl-1");
    });
  });

  describe("archiveTemplate", () => {
    it("archived_at을 채우고, 이 템플릿에서 나온 고정 업무 인스턴스를 삭제한다", async () => {
      const updateQuery = makeQuery({ error: null });
      const deleteQuery = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => updateQuery); // task_templates update
      fromMock.mockImplementationOnce(() => deleteQuery); // tasks delete

      await archiveTemplate("tpl-1");

      expect(fromMock).toHaveBeenNthCalledWith(1, "task_templates");
      expect(fromMock).toHaveBeenNthCalledWith(2, "tasks");
      const updateCall = (updateQuery.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.archived_at).toBeTruthy();
      expect(updateQuery.eq).toHaveBeenCalledWith("id", "tpl-1");
      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenCalledWith("template_id", "tpl-1");
    });
  });

  describe("createTask", () => {
    it("template_id 없이 일반 업무를 생성한다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await createTask({ name: "디자인 시안", memo: "1차", taskDate: "2026-09-04" });

      expect(query.insert).toHaveBeenCalledWith({
        template_id: null,
        name: "디자인 시안",
        memo: "1차",
        task_date: "2026-09-04",
        weekday: null,
        week_start: null,
      });
    });
  });

  describe("updateTask", () => {
    it("이름, 메모, 날짜를 수정한다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await updateTask("task-1", { name: "새 이름", memo: "진행중", taskDate: "2026-09-05" });

      expect(query.update).toHaveBeenCalledWith({
        name: "새 이름",
        memo: "진행중",
        task_date: "2026-09-05",
      });
      expect(query.eq).toHaveBeenCalledWith("id", "task-1");
    });
  });

  describe("setTaskCompletion", () => {
    it("완료 처리 시 completed_at을 채운다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await setTaskCompletion("task-1", true);

      const updateCall = (query.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(updateCall.is_completed).toBe(true);
      expect(updateCall.completed_at).toBeTruthy();
    });

    it("완료 취소 시 completed_at을 null로 되돌린다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await setTaskCompletion("task-1", false);

      expect(query.update).toHaveBeenCalledWith({ is_completed: false, completed_at: null });
    });
  });

  describe("deleteTask", () => {
    it("업무를 삭제한다", async () => {
      const query = makeQuery({ error: null });
      fromMock.mockImplementationOnce(() => query);

      await deleteTask("task-1");

      expect(fromMock).toHaveBeenCalledWith("tasks");
      expect(query.eq).toHaveBeenCalledWith("id", "task-1");
    });
  });
});
