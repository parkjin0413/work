"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { trashMessage } from "@/lib/google/gmailClient";

export async function trashMessageAction(messageId: string): Promise<void> {
  await requireAdmin();
  await trashMessage(messageId);
  revalidatePath("/gmail");
}
