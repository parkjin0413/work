"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createItem } from "@/lib/notion/notionClient";

export async function createItemAction(params: {
  databaseId: string;
  titlePropertyName: string;
  title: string;
}): Promise<void> {
  await requireAdmin();

  if (!params.title.trim()) {
    throw new Error("제목을 입력해주세요.");
  }

  await createItem({
    databaseId: params.databaseId,
    titlePropertyName: params.titlePropertyName,
    title: params.title.trim(),
  });

  revalidatePath(`/notion/${params.databaseId}`);
}
