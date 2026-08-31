import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  gmailIsConnectedMock,
  listRecentMessagesMock,
  driveIsConnectedMock,
  listFolderMock,
  isNotionConfiguredMock,
  listSharedDatabasesMock,
} = vi.hoisted(() => ({
  gmailIsConnectedMock: vi.fn(),
  listRecentMessagesMock: vi.fn(),
  driveIsConnectedMock: vi.fn(),
  listFolderMock: vi.fn(),
  isNotionConfiguredMock: vi.fn(),
  listSharedDatabasesMock: vi.fn(),
}));

vi.mock("@/lib/google/gmailClient", () => ({
  isGoogleConnected: gmailIsConnectedMock,
  listRecentMessages: listRecentMessagesMock,
}));

vi.mock("@/lib/google/driveClient", () => ({
  isGoogleConnected: driveIsConnectedMock,
  listFolder: listFolderMock,
}));

vi.mock("@/lib/notion/notionClient", () => ({
  isNotionConfigured: isNotionConfiguredMock,
  listSharedDatabases: listSharedDatabasesMock,
}));

import { getGmailSummary, getDriveSummary, getNotionSummary } from "./homeSummary";

describe("getGmailSummary", () => {
  beforeEach(() => {
    gmailIsConnectedMock.mockReset();
    listRecentMessagesMock.mockReset();
  });

  it("연결되어 있지 않으면 not_connected 상태를 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(false);

    const result = await getGmailSummary();

    expect(result).toEqual({ state: "not_connected" });
    expect(listRecentMessagesMock).not.toHaveBeenCalled();
  });

  it("연결되어 있으면 최근 메일 제목 목록을 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockResolvedValue([
      { id: "1", subject: "제목1", from: "", date: "", snippet: "" },
      { id: "2", subject: "제목2", from: "", date: "", snippet: "" },
    ]);

    const result = await getGmailSummary();

    expect(listRecentMessagesMock).toHaveBeenCalledWith(3);
    expect(result).toEqual({ state: "ok", subjects: ["제목1", "제목2"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    gmailIsConnectedMock.mockResolvedValue(true);
    listRecentMessagesMock.mockRejectedValue(new Error("token expired"));

    const result = await getGmailSummary();

    expect(result).toEqual({ state: "error" });
  });

  it("연결 확인이 실패하면 error 상태를 반환한다", async () => {
    gmailIsConnectedMock.mockRejectedValue(new Error("supabase error"));

    const result = await getGmailSummary();

    expect(result).toEqual({ state: "error" });
  });
});

describe("getDriveSummary", () => {
  beforeEach(() => {
    driveIsConnectedMock.mockReset();
    listFolderMock.mockReset();
  });

  it("연결되어 있지 않으면 not_connected 상태를 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(false);

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "not_connected" });
    expect(listFolderMock).not.toHaveBeenCalled();
  });

  it("연결되어 있으면 최근 파일 이름 목록을 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "f1", name: "문서1.txt", isFolder: false, modifiedTime: "", size: null },
        { id: "f2", name: "문서2.txt", isFolder: false, modifiedTime: "", size: null },
      ],
    });

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "ok", names: ["문서1.txt", "문서2.txt"] });
  });

  it("파일이 3개를 초과하면 처음 3개만 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "f1", name: "파일1", isFolder: false, modifiedTime: "", size: null },
        { id: "f2", name: "파일2", isFolder: false, modifiedTime: "", size: null },
        { id: "f3", name: "파일3", isFolder: false, modifiedTime: "", size: null },
        { id: "f4", name: "파일4", isFolder: false, modifiedTime: "", size: null },
        { id: "f5", name: "파일5", isFolder: false, modifiedTime: "", size: null },
      ],
    });

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "ok", names: ["파일1", "파일2", "파일3"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockRejectedValue(new Error("token expired"));

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "error" });
  });

  it("연결 확인이 실패하면 error 상태를 반환한다", async () => {
    driveIsConnectedMock.mockRejectedValue(new Error("supabase error"));

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "error" });
  });

  it("폴더를 제외하고 최근 수정 순으로 정렬한다", async () => {
    driveIsConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "d1", name: "폴더1", isFolder: true, modifiedTime: "2026-08-30T00:00:00Z", size: null },
        { id: "f1", name: "오래된파일.txt", isFolder: false, modifiedTime: "2026-01-01T00:00:00Z", size: null },
        { id: "f2", name: "최신파일.txt", isFolder: false, modifiedTime: "2026-08-01T00:00:00Z", size: null },
      ],
    });

    const result = await getDriveSummary();

    expect(result).toEqual({ state: "ok", names: ["최신파일.txt", "오래된파일.txt"] });
  });
});

describe("getNotionSummary", () => {
  beforeEach(() => {
    isNotionConfiguredMock.mockReset();
    listSharedDatabasesMock.mockReset();
  });

  it("설정되지 않은 경우 not_configured 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(false);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "not_configured" });
    expect(listSharedDatabasesMock).not.toHaveBeenCalled();
  });

  it("공유된 데이터베이스가 없으면 empty 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "empty" });
  });

  it("공유된 데이터베이스가 있으면 제목 목록을 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([
      { id: "db-1", title: "할 일 목록" },
      { id: "db-2", title: "프로젝트" },
    ]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "ok", titles: ["할 일 목록", "프로젝트"] });
  });

  it("데이터베이스가 3개를 초과하면 처음 3개만 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockResolvedValue([
      { id: "db-1", title: "DB1" },
      { id: "db-2", title: "DB2" },
      { id: "db-3", title: "DB3" },
      { id: "db-4", title: "DB4" },
    ]);

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "ok", titles: ["DB1", "DB2", "DB3"] });
  });

  it("조회가 실패하면 error 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockReturnValue(true);
    listSharedDatabasesMock.mockRejectedValue(new Error("invalid token"));

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "error" });
  });

  it("설정 확인이 실패하면 error 상태를 반환한다", async () => {
    isNotionConfiguredMock.mockImplementation(() => {
      throw new Error("env read error");
    });

    const result = await getNotionSummary();

    expect(result).toEqual({ state: "error" });
  });
});
