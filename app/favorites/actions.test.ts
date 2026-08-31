import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createFavorite: vi.fn(),
    renameFavorite: vi.fn(),
    deleteFavorite: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/favorites/favoritesStore", () => storeMock);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  createFavoriteAction,
  renameFavoriteAction,
  deleteFavoriteAction,
} from "./actions";

function resetAll() {
  requireAdminMock.mockReset();
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
  requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
}

describe("createCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.createCategory.mockResolvedValue(undefined);
    await createCategoryAction("업무");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(createCategoryAction("업무")).rejects.toThrow();
    expect(storeMock.createCategory).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 createCategory를 호출하지 않는다", async () => {
    await expect(createCategoryAction("   ")).rejects.toThrow("카테고리 이름을 입력해주세요.");
    expect(storeMock.createCategory).not.toHaveBeenCalled();
  });

  it("정상 생성은 createCategory와 revalidatePath를 호출한다", async () => {
    storeMock.createCategory.mockResolvedValue(undefined);
    await createCategoryAction("업무");
    expect(storeMock.createCategory).toHaveBeenCalledWith("업무");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("renameCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.renameCategory.mockResolvedValue(undefined);
    await renameCategoryAction("cat-1", "새 이름");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(renameCategoryAction("cat-1", "새 이름")).rejects.toThrow();
    expect(storeMock.renameCategory).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 renameCategory를 호출하지 않는다", async () => {
    await expect(renameCategoryAction("cat-1", "  ")).rejects.toThrow("카테고리 이름을 입력해주세요.");
    expect(storeMock.renameCategory).not.toHaveBeenCalled();
  });

  it("정상 변경은 renameCategory와 revalidatePath를 호출한다", async () => {
    storeMock.renameCategory.mockResolvedValue(undefined);
    await renameCategoryAction("cat-1", "새 이름");
    expect(storeMock.renameCategory).toHaveBeenCalledWith("cat-1", "새 이름");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("deleteCategoryAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.deleteCategory.mockResolvedValue(undefined);
    await deleteCategoryAction("cat-1");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 deleteCategory를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteCategoryAction("cat-1")).rejects.toThrow();
    expect(storeMock.deleteCategory).not.toHaveBeenCalled();
  });

  it("정상 삭제는 deleteCategory와 revalidatePath를 호출한다", async () => {
    storeMock.deleteCategory.mockResolvedValue(undefined);
    await deleteCategoryAction("cat-1");
    expect(storeMock.deleteCategory).toHaveBeenCalledWith("cat-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("createFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.createFavorite.mockResolvedValue(undefined);
    await createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" });
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 createFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" })
    ).rejects.toThrow();
    expect(storeMock.createFavorite).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 createFavorite를 호출하지 않는다", async () => {
    await expect(
      createFavoriteAction({ categoryId: "cat-1", name: "  ", url: "https://wiki.example.com" })
    ).rejects.toThrow("이름을 입력해주세요.");
    expect(storeMock.createFavorite).not.toHaveBeenCalled();
  });

  it("정상 생성은 createFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.createFavorite.mockResolvedValue(undefined);
    await createFavoriteAction({ categoryId: "cat-1", name: "위키", url: "https://wiki.example.com" });
    expect(storeMock.createFavorite).toHaveBeenCalledWith({
      categoryId: "cat-1",
      name: "위키",
      url: "https://wiki.example.com",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("renameFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.renameFavorite.mockResolvedValue(undefined);
    await renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" });
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" })
    ).rejects.toThrow();
    expect(storeMock.renameFavorite).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 renameFavorite를 호출하지 않는다", async () => {
    await expect(
      renameFavoriteAction({ id: "fav-1", name: "   ", url: "https://new.example.com" })
    ).rejects.toThrow("이름을 입력해주세요.");
    expect(storeMock.renameFavorite).not.toHaveBeenCalled();
  });

  it("정상 변경은 renameFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.renameFavorite.mockResolvedValue(undefined);
    await renameFavoriteAction({ id: "fav-1", name: "새 이름", url: "https://new.example.com" });
    expect(storeMock.renameFavorite).toHaveBeenCalledWith("fav-1", {
      name: "새 이름",
      url: "https://new.example.com",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});

describe("deleteFavoriteAction", () => {
  beforeEach(resetAll);

  it("requireAdmin을 호출한다", async () => {
    storeMock.deleteFavorite.mockResolvedValue(undefined);
    await deleteFavoriteAction("fav-1");
    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 deleteFavorite를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(deleteFavoriteAction("fav-1")).rejects.toThrow();
    expect(storeMock.deleteFavorite).not.toHaveBeenCalled();
  });

  it("정상 삭제는 deleteFavorite와 revalidatePath를 호출한다", async () => {
    storeMock.deleteFavorite.mockResolvedValue(undefined);
    await deleteFavoriteAction("fav-1");
    expect(storeMock.deleteFavorite).toHaveBeenCalledWith("fav-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/favorites");
  });
});
