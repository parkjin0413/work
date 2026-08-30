import { Readable } from "stream";
import { google, drive_v3 } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { getGoogleRefreshToken } from "@/lib/google/tokenStore";

export type DriveFileSummary = {
  id: string;
  name: string;
  isFolder: boolean;
  modifiedTime: string;
  size: string | null;
};

export type DriveFolderView = {
  folderId: string;
  folderName: string;
  parentId: string | null;
  files: DriveFileSummary[];
};

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const VALID_ID_PATTERN = /^[\w-]+$/;

async function getDriveClient(): Promise<drive_v3.Drive | null> {
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const auth = createGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth });
}

function extractErrorStatus(error: unknown): number {
  const status =
    (error as { response?: { status?: number } })?.response?.status ??
    Number((error as { code?: number | string })?.code);
  return Number.isNaN(status) ? 0 : Number(status);
}

export async function isGoogleConnected(): Promise<boolean> {
  const refreshToken = await getGoogleRefreshToken();
  return refreshToken !== null;
}

export async function listFolder(folderId: string = "root"): Promise<DriveFolderView | null> {
  if (!VALID_ID_PATTERN.test(folderId)) {
    return null;
  }

  const drive = await getDriveClient();
  if (!drive) {
    return null;
  }

  try {
    let folderName = "내 드라이브";
    let parentId: string | null = null;

    if (folderId !== "root") {
      const folderMeta = await drive.files.get({
        fileId: folderId,
        fields: "id, name, parents",
      });
      folderName = folderMeta.data.name ?? "폴더";
      parentId = folderMeta.data.parents?.[0] ?? "root";
    }

    const listResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "files(id, name, mimeType, modifiedTime, size)",
      orderBy: "folder,name",
    });

    const files: DriveFileSummary[] = (listResponse.data.files ?? []).map((file) => ({
      id: file.id!,
      name: file.name ?? "(이름 없음)",
      isFolder: file.mimeType === FOLDER_MIME_TYPE,
      modifiedTime: file.modifiedTime ?? "",
      size: file.size ?? null,
    }));

    return { folderId, folderName, parentId, files };
  } catch (error) {
    if (extractErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function uploadFile(params: {
  folderId: string;
  fileName: string;
  mimeType: string;
  content: Buffer;
}): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.create({
    requestBody: {
      name: params.fileName,
      parents: [params.folderId],
    },
    media: {
      mimeType: params.mimeType,
      body: Readable.from(params.content),
    },
  });
}

export async function renameFile(fileId: string, newName: string): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.update({
    fileId,
    requestBody: { name: newName },
  });
}

export async function trashFile(fileId: string): Promise<void> {
  const drive = await getDriveClient();
  if (!drive) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await drive.files.update({
    fileId,
    requestBody: { trashed: true },
  });
}
