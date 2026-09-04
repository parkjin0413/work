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

vi.mock("@/lib/crypto/tokenCipher", () => ({
  encryptToken: (plainText: string) => `enc:${plainText}`,
  decryptToken: (cipherText: string) => cipherText.replace(/^enc:/, ""),
}));

import {
  listAccountsBoard,
  createCategory,
  renameCategory,
  deleteCategory,
  createAccount,
  renameAccount,
  deleteAccount,
  reorderAccounts,
} from "./accountsStore";

describe("accountsStore", () => {
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

  describe("listAccountsBoard", () => {
    it("카테고리 목록과, 카테고리 이름이 붙은 전역 정렬된 계정 목록을 반환하고 비밀번호를 복호화한다", async () => {
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
            {
              id: "acc-1",
              name: "사내 관리자",
              url: "https://admin.example.com",
              username: "admin",
              password_encrypted: "enc:secret1",
              memo: "메모1",
              category_id: "cat-1",
            },
            {
              id: "acc-2",
              name: "개인 메일",
              url: "https://mail.example.com",
              username: "me",
              password_encrypted: "enc:secret2",
              memo: null,
              category_id: "cat-2",
            },
          ],
          error: null,
        });

      const result = await listAccountsBoard();

      expect(fromMock).toHaveBeenCalledWith("account_categories");
      expect(fromMock).toHaveBeenCalledWith("accounts");
      expect(result).toEqual({
        categories: [
          { id: "cat-1", name: "업무" },
          { id: "cat-2", name: "개인" },
        ],
        accounts: [
          {
            id: "acc-1",
            name: "사내 관리자",
            url: "https://admin.example.com",
            username: "admin",
            password: "secret1",
            memo: "메모1",
            categoryId: "cat-1",
            categoryName: "업무",
          },
          {
            id: "acc-2",
            name: "개인 메일",
            url: "https://mail.example.com",
            username: "me",
            password: "secret2",
            memo: null,
            categoryId: "cat-2",
            categoryName: "개인",
          },
        ],
      });
    });

    it("카테고리 조회가 실패하면 에러를 던진다", async () => {
      orderMock.mockResolvedValueOnce({ data: null, error: { message: "db down" } });

      await expect(listAccountsBoard()).rejects.toThrow("db down");
    });
  });

  describe("createCategory", () => {
    it("카테고리를 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createCategory("업무");

      expect(fromMock).toHaveBeenCalledWith("account_categories");
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

      expect(fromMock).toHaveBeenCalledWith("account_categories");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "cat-1");
    });
  });

  describe("createAccount", () => {
    it("비밀번호를 암호화해서 계정을 생성한다", async () => {
      insertMock.mockResolvedValue({ error: null });

      await createAccount({
        categoryId: "cat-1",
        name: "사내 관리자",
        url: "https://admin.example.com",
        username: "admin",
        password: "secret1",
        memo: "메모1",
      });

      expect(fromMock).toHaveBeenCalledWith("accounts");
      expect(insertMock).toHaveBeenCalledWith({
        category_id: "cat-1",
        name: "사내 관리자",
        url: "https://admin.example.com",
        username: "admin",
        password_encrypted: "enc:secret1",
        memo: "메모1",
      });
    });

    it("http/https로 시작하지 않는 URL은 거부한다", async () => {
      await expect(
        createAccount({
          categoryId: "cat-1",
          name: "위험",
          url: "javascript:alert(1)",
          username: "admin",
          password: "secret1",
          memo: null,
        })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
      expect(insertMock).not.toHaveBeenCalled();
    });
  });

  describe("renameAccount", () => {
    it("비밀번호를 다시 암호화해서 계정을 수정한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await renameAccount("acc-1", {
        categoryId: "cat-2",
        name: "새 이름",
        url: "https://new.example.com",
        username: "new-admin",
        password: "new-secret",
        memo: null,
      });

      expect(updateMock).toHaveBeenCalledWith({
        category_id: "cat-2",
        name: "새 이름",
        url: "https://new.example.com",
        username: "new-admin",
        password_encrypted: "enc:new-secret",
        memo: null,
      });
      expect(eqMock).toHaveBeenCalledWith("id", "acc-1");
    });

    it("잘못된 URL이면 거부한다", async () => {
      await expect(
        renameAccount("acc-1", {
          categoryId: "cat-1",
          name: "이름",
          url: "not-a-url",
          username: "admin",
          password: "secret",
          memo: null,
        })
      ).rejects.toThrow("올바른 URL 형식이 아닙니다");
    });
  });

  describe("deleteAccount", () => {
    it("계정을 삭제한다", async () => {
      deleteEqMock.mockResolvedValue({ error: null });

      await deleteAccount("acc-1");

      expect(fromMock).toHaveBeenCalledWith("accounts");
      expect(deleteEqMock).toHaveBeenCalledWith("id", "acc-1");
    });
  });

  describe("reorderAccounts", () => {
    it("주어진 순서대로 각 행의 sort_order를 업데이트한다", async () => {
      eqMock.mockResolvedValue({ error: null });

      await reorderAccounts(["acc-2", "acc-1"]);

      expect(fromMock).toHaveBeenCalledWith("accounts");
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 0 });
      expect(updateMock).toHaveBeenCalledWith({ sort_order: 1 });
      expect(eqMock).toHaveBeenCalledWith("id", "acc-2");
      expect(eqMock).toHaveBeenCalledWith("id", "acc-1");
    });

    it("실패하면 에러를 던진다", async () => {
      eqMock.mockResolvedValue({ error: { message: "db down" } });

      await expect(reorderAccounts(["acc-1"])).rejects.toThrow("db down");
    });
  });
});
