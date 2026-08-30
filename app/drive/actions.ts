"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { uploadFile, renameFile, trashFile } from "@/lib/google/driveClient";

export async function uploadFileAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const file = formData.get("file");
  const folderId = formData.get("folderId");

  if (!(file instanceof File) || typeof folderId !== "string") {
    throw new Error("업로드할 파일이 없습니다.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const content = Buffer.from(arrayBuffer);

  await uploadFile({
    folderId,
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    content,
  });

  revalidatePath("/drive");
}

export async function renameFileAction(fileId: string, newName: string): Promise<void> {
  await requireAdmin();

  if (!newName.trim()) {
    throw new Error("이름을 입력해주세요.");
  }

  await renameFile(fileId, newName.trim());
  revalidatePath("/drive");
}

export async function trashFileAction(fileId: string): Promise<void> {
  await requireAdmin();
  await trashFile(fileId);
  revalidatePath("/drive");
}
