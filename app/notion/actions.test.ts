import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, createItemMock, renameItemMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  createItemMock: vi.fn(),
  renameItemMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  createItem: createItemMock,
  renameItem: renameItemMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createItemAction, renameItemAction } from "./actions";

describe("createItemAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createItemMock.mockReset();
    renameItemMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("requireAdmin을 호출한다", async () => {
    createItemMock.mockResolvedValue(undefined);

    await createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createItem을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(
      createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" })
    ).rejects.toThrow();
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("빈 제목으로는 createItem을 호출하지 않는다", async () => {
    await expect(
      createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "   " })
    ).rejects.toThrow("제목을 입력해주세요.");
    expect(createItemMock).not.toHaveBeenCalled();
  });

  it("정상적인 생성은 createItem과 revalidatePath를 호출한다", async () => {
    createItemMock.mockResolvedValue(undefined);

    await createItemAction({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(createItemMock).toHaveBeenCalledWith({
      databaseId: "db-1",
      titlePropertyName: "이름",
      title: "새 항목",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notion/db-1");
  });
});

describe("renameItemAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createItemMock.mockReset();
    renameItemMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("requireAdmin을 호출한다", async () => {
    renameItemMock.mockResolvedValue(undefined);

    await renameItemAction({
      pageId: "page-1",
      databaseId: "db-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameItem을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(
      renameItemAction({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "수정된 항목",
      })
    ).rejects.toThrow();
    expect(renameItemMock).not.toHaveBeenCalled();
  });

  it("빈 제목으로는 renameItem을 호출하지 않는다", async () => {
    await expect(
      renameItemAction({
        pageId: "page-1",
        databaseId: "db-1",
        titlePropertyName: "이름",
        newTitle: "   ",
      })
    ).rejects.toThrow("제목을 입력해주세요.");
    expect(renameItemMock).not.toHaveBeenCalled();
  });

  it("정상적인 이름 변경은 renameItem과 revalidatePath를 호출한다", async () => {
    renameItemMock.mockResolvedValue(undefined);

    await renameItemAction({
      pageId: "page-1",
      databaseId: "db-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });

    expect(renameItemMock).toHaveBeenCalledWith({
      pageId: "page-1",
      titlePropertyName: "이름",
      newTitle: "수정된 항목",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/notion/db-1");
  });
});
