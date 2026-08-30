"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { sendEmail } from "@/lib/google/gmailClient";

export async function sendEmailAction(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  await requireAdmin();
  await sendEmail(params);
}
