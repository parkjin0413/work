import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    addProjectStep: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
    setProjectCompleted: vi.fn(),
    updateProject: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/tasks/projects", () => storeMock);
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { addProjectStepAction, createProjectAction, updateProjectAction } from "./projectActions";

beforeEach(() => {
  requireAdminMock.mockReset().mockResolvedValue({ email: "admin@example.com" });
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
});

describe("projectActions", () => {
  it("이름을 다듬어 프로젝트를 만든다", async () => {
    storeMock.createProject.mockResolvedValue("p1");
    await expect(createProjectAction("  홈페이지 리뉴얼 ", "project")).resolves.toBe("p1");
    expect(storeMock.createProject).toHaveBeenCalledWith("홈페이지 리뉴얼", "project");
    expect(revalidatePathMock).toHaveBeenCalledWith("/tasks");
  });

  it("빈 이름과 잘못된 종류는 거부한다", async () => {
    await expect(createProjectAction(" ", "project")).rejects.toThrow("이름을 입력해주세요.");
    await expect(createProjectAction("x", "etc" as never)).rejects.toThrow("종류가 올바르지 않습니다.");
    expect(storeMock.createProject).not.toHaveBeenCalled();
  });

  it("빈 설명은 null로 저장한다", async () => {
    await updateProjectAction("p1", { memo: "  " });
    expect(storeMock.updateProject).toHaveBeenCalledWith("p1", { memo: null });
  });

  it("빈 단계는 거부한다", async () => {
    await expect(addProjectStepAction("p1", "  ")).rejects.toThrow("내용을 입력해주세요.");
    expect(storeMock.addProjectStep).not.toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 아무것도 저장하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(createProjectAction("x", "project")).rejects.toThrow();
    expect(storeMock.createProject).not.toHaveBeenCalled();
  });
});
