"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { ALL_FIELDS, type HostingValues } from "@/lib/hosting/fields";
import {
  createHostingSite,
  updateHostingSite,
  deleteHostingSite,
  reorderHostingSites,
} from "@/lib/hosting/hostingStore";

function pickValues(values: HostingValues): HostingValues {
  return Object.fromEntries(ALL_FIELDS.map((field) => [field.key, String(values[field.key] ?? "")]));
}

export async function createHostingSiteAction(values: HostingValues): Promise<void> {
  await requireAdmin();

  await createHostingSite(pickValues(values));
  revalidatePath("/hosting");
}

export async function updateHostingSiteAction(id: string, values: HostingValues): Promise<void> {
  await requireAdmin();

  await updateHostingSite(id, pickValues(values));
  revalidatePath("/hosting");
}

export async function deleteHostingSiteAction(id: string): Promise<void> {
  await requireAdmin();

  await deleteHostingSite(id);
  revalidatePath("/hosting");
}

export async function reorderHostingSitesAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  await reorderHostingSites(orderedIds);
  revalidatePath("/hosting");
}
