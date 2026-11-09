import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    createWorkItem: vi.fn(),
    createWorkItems: vi.fn(),
    updateWorkItem: vi.fn(),
    moveWorkItems: vi.fn(),
    deleteWorkItem: vi.fn(),
    reorderWorkItems: vi.fn(),
    searchWorkItems: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/tasks/workItems", () => storeMock);
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import {
  createWorkItemAction,
  createWorkItemsAction,
  deleteWorkItemAction,
  moveWorkItemsAction,
  reorderWorkItemsAction,
  searchWorkItemsAction,
  updateWorkItemAction,
} from "./workItemActions";

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ email: "admin@example.com" });
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
});

describe("createWorkItemAction", () => {
  it("내용을 다듬고 빈 프로젝트는 null로 저장한다", async () => {
    storeMock.createWorkItem.mockResolvedValue({ id: "n1" });

    await createWorkItemAction({ date: "2026-11-09", body: "  사이트맵 확정 ", status: "planned", projectId: "" });

    expect(storeMock.createWorkItem).toHaveBeenCalledWith({
      date: "2026-11-09",
      body: "사이트맵 확정",
      status: "planned",
      projectId: null,
      scheduleId: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });

  it("빈 내용, 잘못된 날짜·상태는 거부한다", async () => {
    await expect(
      createWorkItemAction({ date: "2026-11-09", body: "  ", status: "done", projectId: null })
    ).rejects.toThrow("내용을 입력해주세요.");
    await expect(
      createWorkItemAction({ date: "2026-13-40", body: "x", status: "done", projectId: null })
    ).rejects.toThrow("날짜가 올바르지 않습니다.");
    await expect(
      createWorkItemAction({ date: "2026-11-09", body: "x", status: "later" as never, projectId: null })
    ).rejects.toThrow("상태가 올바르지 않습니다.");
    expect(storeMock.createWorkItem).not.toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 저장하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      createWorkItemAction({ date: "2026-11-09", body: "x", status: "done", projectId: null })
    ).rejects.toThrow();
    expect(storeMock.createWorkItem).not.toHaveBeenCalled();
  });
});

describe("updateWorkItemAction", () => {
  it("넘긴 값만 검증해서 수정한다", async () => {
    await updateWorkItemAction("n1", { status: "done" });
    expect(storeMock.updateWorkItem).toHaveBeenCalledWith("n1", { status: "done" });
  });
});

describe("moveWorkItemsAction / deleteWorkItemAction", () => {
  it("여러 항목을 한 날짜로 옮긴다", async () => {
    await moveWorkItemsAction(["a", "b"], "2026-11-16");
    expect(storeMock.moveWorkItems).toHaveBeenCalledWith(["a", "b"], "2026-11-16");
  });

  it("항목을 삭제한다", async () => {
    await deleteWorkItemAction("n1");
    expect(storeMock.deleteWorkItem).toHaveBeenCalledWith("n1");
  });
});

describe("reorderWorkItemsAction / searchWorkItemsAction", () => {
  it("순서를 저장하고, 날짜가 있으면 그 날짜로 옮긴다", async () => {
    await reorderWorkItemsAction(["b", "a"], "2026-11-10");
    expect(storeMock.reorderWorkItems).toHaveBeenCalledWith(["b", "a"], "2026-11-10");

    await reorderWorkItemsAction(["s2", "s1"]);
    expect(storeMock.reorderWorkItems).toHaveBeenLastCalledWith(["s2", "s1"], undefined);
  });

  it("잘못된 날짜·빈 목록은 거부한다", async () => {
    await expect(reorderWorkItemsAction(["a"], "2026-13-45x")).rejects.toThrow("날짜가 올바르지 않습니다.");
    await expect(reorderWorkItemsAction([], "2026-11-10")).rejects.toThrow();
    expect(storeMock.reorderWorkItems).not.toHaveBeenCalled();
  });

  it("검색은 두 글자 미만이면 조회하지 않는다", async () => {
    await expect(searchWorkItemsAction(" 나 ")).resolves.toEqual([]);
    expect(storeMock.searchWorkItems).not.toHaveBeenCalled();
    storeMock.searchWorkItems.mockResolvedValue([]);
    await searchWorkItemsAction(" 나스 ");
    expect(storeMock.searchWorkItems).toHaveBeenCalledWith("나스");
  });
});

describe("createWorkItemsAction", () => {
  it("빈 줄을 빼고 한 날짜에 여러 항목을 추가한다", async () => {
    storeMock.createWorkItems.mockResolvedValue([]);
    await createWorkItemsAction({ date: "2026-11-16", bodies: [" A ", "", "B"], status: "planned", projectId: "" });
    expect(storeMock.createWorkItems).toHaveBeenCalledWith({
      date: "2026-11-16",
      bodies: ["A", "B"],
      status: "planned",
      projectId: null,
    });
  });

  it("내용이 없으면 거부한다", async () => {
    await expect(
      createWorkItemsAction({ date: "2026-11-16", bodies: [" "], status: "planned", projectId: null })
    ).rejects.toThrow("내용을 입력해주세요.");
    expect(storeMock.createWorkItems).not.toHaveBeenCalled();
  });
});
