"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import {
  createPartner,
  updatePartner,
  deletePartner,
  reorderPartners,
} from "@/lib/partners/partnersStore";

function normalize(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function createPartnerAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const companyName = String(formData.get("companyName") ?? "");
  if (!companyName.trim()) {
    throw new Error("회사명을 입력해주세요.");
  }

  await createPartner({
    companyName: companyName.trim(),
    representative: normalize(String(formData.get("representative") ?? "")),
    address: normalize(String(formData.get("address") ?? "")),
    businessNumber: normalize(String(formData.get("businessNumber") ?? "")),
    phone: normalize(String(formData.get("phone") ?? "")),
    email: normalize(String(formData.get("email") ?? "")),
    registrationFile: readFile(formData, "registrationFile"),
  });
  revalidatePath("/partners");
}

export async function updatePartnerAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const companyName = String(formData.get("companyName") ?? "");
  if (!companyName.trim()) {
    throw new Error("회사명을 입력해주세요.");
  }

  await updatePartner(id, {
    companyName: companyName.trim(),
    representative: normalize(String(formData.get("representative") ?? "")),
    address: normalize(String(formData.get("address") ?? "")),
    businessNumber: normalize(String(formData.get("businessNumber") ?? "")),
    phone: normalize(String(formData.get("phone") ?? "")),
    email: normalize(String(formData.get("email") ?? "")),
    registrationFile: readFile(formData, "registrationFile"),
    removeRegistrationFile: formData.get("removeRegistrationFile") === "true",
  });
  revalidatePath("/partners");
}

export async function deletePartnerAction(id: string): Promise<void> {
  await requireAdmin();

  await deletePartner(id);
  revalidatePath("/partners");
}

export async function reorderPartnersAction(orderedIds: string[]): Promise<void> {
  await requireAdmin();

  await reorderPartners(orderedIds);
  revalidatePath("/partners");
}
