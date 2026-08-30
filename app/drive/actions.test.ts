// @vitest-environment node
// 서버 액션이므로 Node 환경에서 테스트한다. jsdom의 File 폴리필에는
// actions.ts가 사용하는 arrayBuffer()가 없어서 jsdom에서는 실행할 수 없다.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, uploadFileMock, renameFileMock, trashFileMock, revalidatePathMock } =
  vi.hoisted(() => ({
    requireAdminMock: vi.fn(),
    uploadFileMock: vi.fn(),
    renameFileMock: vi.fn(),
    trashFileMock: vi.fn(),
    revalidatePathMock: vi.fn(),
  }));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/google/driveClient", () => ({
  uploadFile: uploadFileMock,
  renameFile: renameFileMock,
  trashFile: trashFileMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { uploadFileAction, renameFileAction, trashFileAction } from "./actions";

describe("drive actions", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    uploadFileMock.mockReset();
    renameFileMock.mockReset();
    trashFileMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("uploadFileAction은 requireAdmin을 호출한다", async () => {
    uploadFileMock.mockResolvedValue(undefined);
    const formData = new FormData();
    formData.set("file", new File(["hi"], "a.txt", { type: "text/plain" }));
    formData.set("folderId", "root");

    await uploadFileAction(formData);

    expect(requireAdminMock).toHaveBeenCalled();
    expect(uploadFileMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 uploadFile을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));
    const formData = new FormData();
    formData.set("file", new File(["hi"], "a.txt", { type: "text/plain" }));
    formData.set("folderId", "root");

    await expect(uploadFileAction(formData)).rejects.toThrow();
    expect(uploadFileMock).not.toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 trashFile을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(trashFileAction("file-1")).rejects.toThrow();
    expect(trashFileMock).not.toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 renameFile을 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(renameFileAction("file-1", "새이름")).rejects.toThrow();
    expect(renameFileMock).not.toHaveBeenCalled();
  });

  it("빈 이름으로는 renameFile을 호출하지 않는다", async () => {
    await expect(renameFileAction("file-1", "   ")).rejects.toThrow("이름을 입력해주세요.");
    expect(renameFileMock).not.toHaveBeenCalled();
  });

  it("정상적인 이름 변경은 renameFile과 revalidatePath를 호출한다", async () => {
    renameFileMock.mockResolvedValue(undefined);

    await renameFileAction("file-1", "새이름");

    expect(renameFileMock).toHaveBeenCalledWith("file-1", "새이름");
    expect(revalidatePathMock).toHaveBeenCalledWith("/drive");
  });

  it("정상적인 삭제는 trashFile과 revalidatePath를 호출한다", async () => {
    trashFileMock.mockResolvedValue(undefined);

    await trashFileAction("file-1");

    expect(trashFileMock).toHaveBeenCalledWith("file-1");
    expect(revalidatePathMock).toHaveBeenCalledWith("/drive");
  });
});
