import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, createItemMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  createItemMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  createItem: createItemMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { createItemAction } from "./actions";

describe("createItemAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createItemMock.mockReset();
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
