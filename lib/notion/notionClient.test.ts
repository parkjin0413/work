import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { searchMock, databasesRetrieveMock, databasesQueryMock, pagesCreateMock, pagesUpdateMock } =
  vi.hoisted(() => ({
    searchMock: vi.fn(),
    databasesRetrieveMock: vi.fn(),
    databasesQueryMock: vi.fn(),
    pagesCreateMock: vi.fn(),
    pagesUpdateMock: vi.fn(),
  }));

vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    search: searchMock,
    databases: {
      retrieve: databasesRetrieveMock,
      query: databasesQueryMock,
    },
    pages: {
      create: pagesCreateMock,
      update: pagesUpdateMock,
    },
  })),
}));

import {
  isNotionConfigured,
  listSharedDatabases,
  getDatabaseItems,
  createItem,
  renameItem,
} from "./notionClient";

describe("notionClient", () => {
  const originalEnv = process.env.NOTION_API_KEY;

  beforeEach(() => {
    searchMock.mockReset();
    databasesRetrieveMock.mockReset();
    databasesQueryMock.mockReset();
    pagesCreateMock.mockReset();
    pagesUpdateMock.mockReset();
    process.env.NOTION_API_KEY = "test-notion-key";
  });

  afterEach(() => {
    process.env.NOTION_API_KEY = originalEnv;
  });

  it("isNotionConfigured은 NOTION_API_KEY 존재 여부를 반환한다", () => {
    expect(isNotionConfigured()).toBe(true);
    delete process.env.NOTION_API_KEY;
    expect(isNotionConfigured()).toBe(false);
  });

  it("설정되지 않은 경우 listSharedDatabases는 빈 배열을 반환한다", async () => {
    delete process.env.NOTION_API_KEY;

    const result = await listSharedDatabases();

    expect(result).toEqual([]);
    expect(searchMock).not.toHaveBeenCalled();
  });

  it("공유된 데이터베이스 목록을 반환한다", async () => {
    searchMock.mockResolvedValue({
      results: [{ id: "db-1", title: [{ plain_text: "할 일 목록" }] }],
    });

    const result = await listSharedDatabases();

    expect(searchMock).toHaveBeenCalledWith({
      filter: { property: "object", value: "database" },
    });
    expect(result).toEqual([{ id: "db-1", title: "할 일 목록" }]);
  });

  it("설정되지 않은 경우 getDatabaseItems는 null을 반환한다", async () => {
    delete process.env.NOTION_API_KEY;

    const result = await getDatabaseItems("db-1");

    expect(result).toBeNull();
  });

  it("데이터베이스 항목 목록을 title 속성 이름과 함께 반환한다", async () => {
    databasesRetrieveMock.mockResolvedValue({
      title: [{ plain_text: "할 일 목록" }],
      properties: {
        이름: { type: "title" },
        상태: { type: "select" },
      },
    });
    databasesQueryMock.mockResolvedValue({
      results: [{ id: "page-1", properties: { 이름: { title: [{ plain_text: "첫 항목" }] } } }],
    });

    const result = await getDatabaseItems("db-1");

    expect(databasesRetrieveMock).toHaveBeenCalledWith({ database_id: "db-1" });
    expect(databasesQueryMock).toHaveBeenCalledWith({ database_id: "db-1" });
    expect(result).toEqual({
      databaseId: "db-1",
      databaseTitle: "할 일 목록",
      titlePropertyName: "이름",
      items: [{ id: "page-1", title: "첫 항목" }],
    });
  });

  it("존재하지 않는 데이터베이스 ID는 null을 반환한다 (404)", async () => {
    databasesRetrieveMock.mockRejectedValue({ status: 404 });

    const result = await getDatabaseItems("missing-db");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    databasesRetrieveMock.mockRejectedValue({ status: 401 });

    await expect(getDatabaseItems("db-1")).rejects.toBeTruthy();
  });

  it("설정되지 않은 경우 createItem은 에러를 던진다", async () => {
    delete process.env.NOTION_API_KEY;

    await expect(
      createItem({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" })
    ).rejects.toThrow();
  });

  it("createItem은 지정한 title 속성으로 페이지를 생성한다", async () => {
    pagesCreateMock.mockResolvedValue({});

    await createItem({ databaseId: "db-1", titlePropertyName: "이름", title: "새 항목" });

    expect(pagesCreateMock).toHaveBeenCalledWith({
      parent: { database_id: "db-1" },
      properties: {
        이름: { title: [{ text: { content: "새 항목" } }] },
      },
    });
  });

  it("renameItem은 title 속성만 수정한다", async () => {
    pagesUpdateMock.mockResolvedValue({});

    await renameItem({ pageId: "page-1", titlePropertyName: "이름", newTitle: "수정된 항목" });

    expect(pagesUpdateMock).toHaveBeenCalledWith({
      page_id: "page-1",
      properties: {
        이름: { title: [{ text: { content: "수정된 항목" } }] },
      },
    });
  });
});
