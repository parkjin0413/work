"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { trashMessages } from "@/lib/google/gmailClient";

export async function trashMessagesAction(ids: string[]): Promise<void> {
  await requireAdmin();
  await trashMessages(ids);
  revalidatePath("/gmail");
}
