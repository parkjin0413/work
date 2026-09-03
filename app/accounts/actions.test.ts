import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, storeMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  storeMock: {
    createCategory: vi.fn(),
    renameCategory: vi.fn(),
    deleteCategory: vi.fn(),
    createAccount: vi.fn(),
    renameAccount: vi.fn(),
    deleteAccount: vi.fn(),
  },
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/accounts/accountsStore", () => storeMock);

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import {
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  createAccountAction,
  renameAccountAction,
  deleteAccountAction,
} from "./actions";

function resetAll() {
  requireAdminMock.mockReset();
  Object.values(storeMock).forEach((fn) => fn.mockReset());
  revalidatePathMock.mockReset();
  requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
}

describe("createCategoryAction", () => {
  beforeEach(resetAll);

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
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});

describe("renameCategoryAction", () => {
  beforeEach(resetAll);

  it("빈 이름으로는 renameCategory를 호출하지 않는다", async () => {
    await expect(renameCategoryAction("cat-1", "  ")).rejects.toThrow("카테고리 이름을 입력해주세요.");
    expect(storeMock.renameCategory).not.toHaveBeenCalled();
  });

  it("정상 변경은 renameCategory와 revalidatePath를 호출한다", async () => {
    storeMock.renameCategory.mockResolvedValue(undefined);
    await renameCategoryAction("cat-1", "새 이름");
    expect(storeMock.renameCategory).toHaveBeenCalledWith("cat-1", "새 이름");
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});

describe("deleteCategoryAction", () => {
  beforeEach(resetAll);

  it("정상 삭제는 deleteCategory와 revalidatePath를 호출한다", async () => {
    storeMock.deleteCategory.mockResolvedValue(undefined);
    await deleteCategoryAction("cat-1");
    expect(storeMock.deleteCategory).toHaveBeenCalledWith("cat-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});

describe("createAccountAction", () => {
  beforeEach(resetAll);

  it("requireAdmin이 실패하면 createAccount를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    await expect(
      createAccountAction({
        categoryId: "cat-1",
        name: "관리자",
        url: "https://a.example.com",
        username: "admin",
        password: "pw",
        memo: "",
      })
    ).rejects.toThrow();
    expect(storeMock.createAccount).not.toHaveBeenCalled();
  });

  it("계정명이 비어있으면 거부한다", async () => {
    await expect(
      createAccountAction({
        categoryId: "cat-1",
        name: "  ",
        url: "https://a.example.com",
        username: "admin",
        password: "pw",
        memo: "",
      })
    ).rejects.toThrow("계정명을 입력해주세요.");
    expect(storeMock.createAccount).not.toHaveBeenCalled();
  });

  it("아이디가 비어있으면 거부한다", async () => {
    await expect(
      createAccountAction({
        categoryId: "cat-1",
        name: "관리자",
        url: "https://a.example.com",
        username: "  ",
        password: "pw",
        memo: "",
      })
    ).rejects.toThrow("아이디를 입력해주세요.");
    expect(storeMock.createAccount).not.toHaveBeenCalled();
  });

  it("비밀번호가 비어있으면 거부한다", async () => {
    await expect(
      createAccountAction({
        categoryId: "cat-1",
        name: "관리자",
        url: "https://a.example.com",
        username: "admin",
        password: "  ",
        memo: "",
      })
    ).rejects.toThrow("비밀번호를 입력해주세요.");
    expect(storeMock.createAccount).not.toHaveBeenCalled();
  });

  it("정상 생성은 memo가 빈 문자열이면 null로 넘긴다", async () => {
    storeMock.createAccount.mockResolvedValue(undefined);
    await createAccountAction({
      categoryId: "cat-1",
      name: "관리자",
      url: "https://a.example.com",
      username: "admin",
      password: "pw",
      memo: "  ",
    });
    expect(storeMock.createAccount).toHaveBeenCalledWith({
      categoryId: "cat-1",
      name: "관리자",
      url: "https://a.example.com",
      username: "admin",
      password: "pw",
      memo: null,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});

describe("renameAccountAction", () => {
  beforeEach(resetAll);

  it("정상 변경은 renameAccount와 revalidatePath를 호출한다", async () => {
    storeMock.renameAccount.mockResolvedValue(undefined);
    await renameAccountAction({
      id: "acc-1",
      categoryId: "cat-2",
      name: "새 이름",
      url: "https://new.example.com",
      username: "new-admin",
      password: "new-pw",
      memo: "메모",
    });
    expect(storeMock.renameAccount).toHaveBeenCalledWith("acc-1", {
      categoryId: "cat-2",
      name: "새 이름",
      url: "https://new.example.com",
      username: "new-admin",
      password: "new-pw",
      memo: "메모",
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});

describe("deleteAccountAction", () => {
  beforeEach(resetAll);

  it("정상 삭제는 deleteAccount와 revalidatePath를 호출한다", async () => {
    storeMock.deleteAccount.mockResolvedValue(undefined);
    await deleteAccountAction("acc-1");
    expect(storeMock.deleteAccount).toHaveBeenCalledWith("acc-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/accounts");
  });
});
