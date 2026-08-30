import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getGoogleRefreshTokenMock,
  setCredentialsMock,
  createGoogleOAuthClientMock,
  filesGetMock,
  filesListMock,
  filesCreateMock,
  filesUpdateMock,
} = vi.hoisted(() => {
  const setCredentialsMock = vi.fn();
  return {
    getGoogleRefreshTokenMock: vi.fn(),
    setCredentialsMock,
    createGoogleOAuthClientMock: vi.fn(() => ({ setCredentials: setCredentialsMock })),
    filesGetMock: vi.fn(),
    filesListMock: vi.fn(),
    filesCreateMock: vi.fn(),
    filesUpdateMock: vi.fn(),
  };
});

vi.mock("@/lib/google/tokenStore", () => ({
  getGoogleRefreshToken: getGoogleRefreshTokenMock,
}));

vi.mock("@/lib/google/oauthClient", () => ({
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("googleapis", () => ({
  google: {
    drive: vi.fn(() => ({
      files: {
        get: filesGetMock,
        list: filesListMock,
        create: filesCreateMock,
        update: filesUpdateMock,
      },
    })),
  },
}));

import { listFolder, uploadFile, renameFile, trashFile, isGoogleConnected } from "./driveClient";

describe("driveClient", () => {
  beforeEach(() => {
    getGoogleRefreshTokenMock.mockReset();
    setCredentialsMock.mockReset();
    createGoogleOAuthClientMock.mockClear();
    filesGetMock.mockReset();
    filesListMock.mockReset();
    filesCreateMock.mockReset();
    filesUpdateMock.mockReset();
  });

  it("Google 계정이 연결되어 있지 않으면 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await listFolder();

    expect(result).toBeNull();
    expect(filesListMock).not.toHaveBeenCalled();
  });

  it("잘못된 형식의 folderId는 API를 호출하지 않고 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");

    const result = await listFolder("../etc/passwd");

    expect(result).toBeNull();
    expect(filesListMock).not.toHaveBeenCalled();
  });

  it("루트 폴더의 파일/폴더 목록을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesListMock.mockResolvedValue({
      data: {
        files: [
          {
            id: "folder-1",
            name: "문서함",
            mimeType: "application/vnd.google-apps.folder",
            modifiedTime: "2026-08-01T00:00:00Z",
          },
          {
            id: "file-1",
            name: "메모.txt",
            mimeType: "text/plain",
            modifiedTime: "2026-08-02T00:00:00Z",
            size: "120",
          },
        ],
      },
    });

    const result = await listFolder();

    expect(setCredentialsMock).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(filesGetMock).not.toHaveBeenCalled();
    expect(filesListMock).toHaveBeenCalledWith({
      q: "'root' in parents and trashed = false",
      fields: "files(id, name, mimeType, modifiedTime, size)",
      orderBy: "folder,name",
    });
    expect(result).toEqual({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        {
          id: "folder-1",
          name: "문서함",
          isFolder: true,
          modifiedTime: "2026-08-01T00:00:00Z",
          size: null,
        },
        {
          id: "file-1",
          name: "메모.txt",
          isFolder: false,
          modifiedTime: "2026-08-02T00:00:00Z",
          size: "120",
        },
      ],
    });
  });

  it("하위 폴더 조회 시 폴더 이름과 상위 폴더 ID를 함께 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockResolvedValue({
      data: { id: "folder-1", name: "문서함", parents: ["root"] },
    });
    filesListMock.mockResolvedValue({ data: { files: [] } });

    const result = await listFolder("folder-1");

    expect(filesGetMock).toHaveBeenCalledWith({
      fileId: "folder-1",
      fields: "id, name, parents",
    });
    expect(result).toEqual({
      folderId: "folder-1",
      folderName: "문서함",
      parentId: "root",
      files: [],
    });
  });

  it("존재하지 않는 폴더 ID는 null을 반환한다 (404)", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockRejectedValue({ response: { status: 404 } });

    const result = await listFolder("missing-folder");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesGetMock.mockRejectedValue({ response: { status: 401 } });

    await expect(listFolder("some-folder")).rejects.toBeTruthy();
  });

  it("Google 계정이 연결되어 있지 않으면 업로드 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(
      uploadFile({
        folderId: "root",
        fileName: "a.txt",
        mimeType: "text/plain",
        content: Buffer.from("hi"),
      })
    ).rejects.toThrow();
  });

  it("업로드는 지정한 폴더에 파일을 생성한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesCreateMock.mockResolvedValue({});

    await uploadFile({
      folderId: "root",
      fileName: "a.txt",
      mimeType: "text/plain",
      content: Buffer.from("hi"),
    });

    expect(filesCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: { name: "a.txt", parents: ["root"] },
        media: expect.objectContaining({ mimeType: "text/plain" }),
      })
    );
  });

  it("이름변경은 파일의 name 속성만 수정한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesUpdateMock.mockResolvedValue({});

    await renameFile("file-1", "새이름.txt");

    expect(filesUpdateMock).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: { name: "새이름.txt" },
    });
  });

  it("삭제는 trashed를 true로 설정한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    filesUpdateMock.mockResolvedValue({});

    await trashFile("file-1");

    expect(filesUpdateMock).toHaveBeenCalledWith({
      fileId: "file-1",
      requestBody: { trashed: true },
    });
  });

  it("isGoogleConnected은 refresh token 존재 여부를 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("token");
    expect(await isGoogleConnected()).toBe(true);

    getGoogleRefreshTokenMock.mockResolvedValue(null);
    expect(await isGoogleConnected()).toBe(false);
  });
});
