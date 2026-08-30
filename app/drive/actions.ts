"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { uploadFile } from "@/lib/google/driveClient";

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
