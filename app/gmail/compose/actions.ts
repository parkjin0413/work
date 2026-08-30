"use server";

import { sendEmail } from "@/lib/google/gmailClient";

export async function sendEmailAction(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  await sendEmail(params);
}
