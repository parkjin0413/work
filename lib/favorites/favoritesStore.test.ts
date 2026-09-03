import { describe, it, expect, vi, beforeEach } from "vitest";

const orderMock = vi.fn();
const chainOrderMock = vi.fn(() => ({ order: orderMock }));
const selectMock = vi.fn(() => ({ order: chainOrderMock }));
const insertMock = vi.fn();
const eqMock = vi.fn();
const updateMock = vi.fn(() => ({ eq: eqMock }));
const deleteEqMock = vi.fn();
const deleteMock = vi.fn(() => ({ eq: deleteEqMock }));
const fromMock = vi.fn(() => ({
  select: selectMock,
  insert: insertMock,
  update: updateMock,
  delete: deleteMock,
}));

vi.mock("@/lib/supabase/serviceClient", () => ({
  createSupabaseServiceClient: () => ({ from: fromMock }),
}));

import {
  listCategoriesWithFavorites,
  createCategory,
  renameCategory,
  deleteCategory,
  reorderCategories,
  createFavorite,
  renameFavorite,
  deleteFavorite,
  reorderFavorites,
} from "./favoritesStore";

describe("favoritesStore", () => {
  beforeEach(() => {
    fromMock.mockClear();
    selectMock.mockClear();
    chainOrderMock.mockClear();
    orderMock.mockReset();
    insertMock.mockReset();
    updateMock.mockClear();
    eqMock.mockReset();
    deleteMock.mockClear();
    deleteEqMock.mockReset();
  });

  describe("listCategoriesWithFavorites", () => {
    it("카테고리별로 즐겨찾기를 묶어서 반환한다", async () => {
      orderMock
        .mockResolvedValueOnce({
          data: [
            { id: "cat-1", name: "업무" },
            { id: "cat-2", name: "개인" },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            { id: "fav-1", name: "사내 위키", url: "https://wiki.example.com", category_id: "cat-1" },
            { id: "fav-2", name: "블로그", url: "https://blog.example.com", category_id: "cat-2" },
          ],
          error: null,
        });

      const result = await listCategoriesWithFavorites();

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(result).toEqual([
        {
          id: "cat-1",
          name: "업무",
          favorites: [{ id: "fav-1", name: "사내 위키", url: "https://wiki.example.com" }],
        },
        {
          id: "cat-2",
          name: "개인",
          favorites: [{ id: "fav-2", name: "블로그", url: "https://blog.example.com" }],
        },
      ]);
    });

    it("카테고리 조회가 실패하면 에러를 던진다", async () => {
      orderMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });

      await expect(listCategoriesWithFavorites()).rejects.toThrow("db down");
    });
  });

  describe("createCategory", () => {
    it("카테고리를 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createCategory("업무");

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(insertMock).toHaveBeenCalledWith({ name: "업무" });
    });

    it("생성이 실패하면 에러를 던진다", async () => {
      insertMock.mockResolvedValue({ error: { message: "db down" } });

      await expect(createCategory("업무")).rejects.toThrow("db down");
    });
  });

  describe("renameCategory", () => {
    it("카테고리 이름을 변경한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await renameCategory("cat-1", "새 이름");

      expect(updateMock).toHaveBeenCalledWith({ name: "새 이름" });
      expect(eqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  describe("deleteCategory", () => {
    it("카테고리를 삭제한다", async () => {
      deleteEqMock.mockResolvedValue({ error: null });

      await deleteCategory("cat-1");

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  describe("reorderCategories", () => {
    it("주어진 순서대로 각 행의 sort_order를 업데이트한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await reorderCategories(["cat-2", "cat-1"]);

      expect(fromMock).toHaveBeenCalledWith("favorite_categories");
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 0 });
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 1 });
      expect(eqMock).toHaveBeenCalledWith("id", "cat-2");
      expect(eqMock).toHaveBeenCalledWith("id", "cat-1");
    });

    it("실패하면 에러를 던진다", async () => {
      eqMock.mockResolvedValue({ error: { message: "db down" } });

      await expect(reorderCategories(["cat-1"])).rejects.toThrow("db down");
    });
  });

  describe("createFavorite", () => {
    it("올바른 URL이면 즐겨찾기를 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createFavorite({ categoryId: "cat-1", name: "사내 위키", url: "https://wiki.example.com" });

      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(insertMock).toHaveBeenCalledWith({
        category_id: "cat-1",
        name: "사내 위키",
        url: "https://wiki.example.com",
      });
    });

    it("http/https로 시작하지 않는 URL은 거부한다", async () => {
      await expect(
        createFavorite({ categoryId: "cat-1", name: "위험", url: "javascript:alert(1)" })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe("renameFavorite", () => {
    it("이름과 URL을 수정한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await renameFavorite("fav-1", { name: "새 이름", url: "https://new.example.com" });

      expect(updateMock).toHaveBeenCalledWith({ name: "새 이름", url: "https://new.example.com" });
      expect(eqMock).toHaveBeenCalledWith("id", "fav-1");
    });

    it("잘못된 URL이면 거부한다", async () => {
      await expect(
        renameFavorite("fav-1", { name: "이름", url: "not-a-url" })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
    });
  });

  describe("reorderFavorites", () => {
    it("주어진 순서대로 각 행의 sort_order를 업데이트한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await reorderFavorites(["fav-2", "fav-1"]);

      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 0 });
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 1 });
      expect(eqMock).toHaveBeenCalledWith("id", "fav-2");
      expect(eqMock).toHaveBeenCalledWith("id", "fav-1");
    });

    it("실패하면 에러를 던진다", async () => {
      eqMock.mockResolvedValue({ error: { message: "db down" } });

      await expect(reorderFavorites(["fav-1"])).rejects.toThrow("db down");
    });
  });

  describe("deleteFavorite", () => {
    it("즐겨찾기를 삭제한다", async () => {
      deleteEqMock.mockResolvedValue({ error: null });

      await deleteFavorite("fav-1");

      expect(fromMock).toHaveBeenCalledWith("favorites");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "fav-1");
    });
  });
});
