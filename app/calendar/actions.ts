"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createSchedule, updateSchedule, deleteSchedule, type ScheduleInput } from "@/lib/schedule/scheduleStore";

function pick(input: ScheduleInput): ScheduleInput {
  return {
    title: String(input.title ?? ""),
    category: input.category,
    startDate: String(input.startDate ?? ""),
    endDate: String(input.endDate ?? ""),
    memo: input.memo == null ? null : String(input.memo),
  };
}

export async function createScheduleAction(input: ScheduleInput): Promise<void> {
  await requireAdmin();
  await createSchedule(pick(input));
  revalidatePath("/calendar");
}

export async function updateScheduleAction(id: string, input: ScheduleInput): Promise<void> {
  await requireAdmin();
  await updateSchedule(id, pick(input));
  revalidatePath("/calendar");
}

export async function deleteScheduleAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteSchedule(id);
  revalidatePath("/calendar");
}
