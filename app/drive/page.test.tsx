import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import DrivePage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { isGoogleConnectedMock, listFolderMock } = vi.hoisted(() => ({
  isGoogleConnectedMock: vi.fn(),
  listFolderMock: vi.fn(),
}));

vi.mock("@/lib/google/driveClient", () => ({
  isGoogleConnected: isGoogleConnectedMock,
  listFolder: listFolderMock,
}));

async function renderDrivePage(searchParams: { folderId?: string } = {}) {
  const element = await DrivePage({ searchParams });
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      {element}
    </ThemeProvider>
  );
}

describe("DrivePage", () => {
  beforeEach(() => {
    isGoogleConnectedMock.mockReset();
    listFolderMock.mockReset();
  });

  it("연결되지 않은 경우 Google 계정 연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(false);

    await renderDrivePage();

    expect(
      screen.getByText("Drive를 사용하려면 먼저 Google 계정을 연결해야 합니다.")
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Google 계정 연결" })).toHaveAttribute(
      "href",
      "/api/auth/google/start"
    );
    expect(listFolderMock).not.toHaveBeenCalled();
  });

  it("연결된 경우 폴더 목록을 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [
        { id: "folder-1", name: "문서함", isFolder: true, modifiedTime: "", size: null },
        { id: "file-1", name: "메모.txt", isFolder: false, modifiedTime: "", size: "120" },
      ],
    });

    await renderDrivePage();

    expect(listFolderMock).toHaveBeenCalledWith("root");
    expect(screen.getByText("내 드라이브")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /문서함/ })).toHaveAttribute(
      "href",
      "/drive?folderId=folder-1"
    );
    expect(screen.getByText("메모.txt")).toBeInTheDocument();
  });

  it("상위 폴더가 있으면 상위 폴더 링크를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "folder-1",
      folderName: "문서함",
      parentId: "root",
      files: [],
    });

    await renderDrivePage({ folderId: "folder-1" });

    expect(listFolderMock).toHaveBeenCalledWith("folder-1");
    expect(screen.getByRole("link", { name: "← 상위 폴더" })).toHaveAttribute(
      "href",
      "/drive?folderId=root"
    );
  });

  it("폴더가 비어 있으면 안내 문구를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockResolvedValue({
      folderId: "root",
      folderName: "내 드라이브",
      parentId: null,
      files: [],
    });

    await renderDrivePage();

    expect(screen.getByText("폴더가 비어 있습니다.")).toBeInTheDocument();
  });

  it("조회가 실패하면 재연결 안내를 보여준다", async () => {
    isGoogleConnectedMock.mockResolvedValue(true);
    listFolderMock.mockRejectedValue(new Error("token expired"));

    await renderDrivePage();

    expect(
      screen.getByText("Google Drive 연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });
});
