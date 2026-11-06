"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createVehicle, deleteVehicle, updateVehicle } from "@/lib/vehicles/vehiclesStore";

function readInput(params: { model: string; plateNumber: string }) {
  const plateNumber = String(params.plateNumber ?? "").trim();
  if (!plateNumber) throw new Error("차량번호를 입력해주세요.");
  const model = String(params.model ?? "").trim();
  return { model: model || null, plateNumber };
}

export async function createVehicleAction(params: { model: string; plateNumber: string }): Promise<void> {
  await requireAdmin();
  await createVehicle(readInput(params));
  revalidatePath("/company");
}

export async function updateVehicleAction(params: { id: string; model: string; plateNumber: string }): Promise<void> {
  await requireAdmin();
  await updateVehicle(params.id, readInput(params));
  revalidatePath("/company");
}

export async function deleteVehicleAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteVehicle(id);
  revalidatePath("/company");
}
