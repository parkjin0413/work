"use server";

import { revalidatePath } from "next/cache";
import { trashMessage } from "@/lib/google/gmailClient";

export async function trashMessageAction(messageId: string): Promise<void> {
  await trashMessage(messageId);
  revalidatePath("/gmail");
}
