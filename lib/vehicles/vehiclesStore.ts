import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

export type CompanyVehicle = { id: string; model: string | null; plateNumber: string };

export async function listVehicles(): Promise<CompanyVehicle[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("company_vehicles")
    .select("id, model, plate_number")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`회사 차량 조회 실패: ${error.message}`);
  }

  return (data ?? []).map((v) => ({ id: v.id, model: v.model, plateNumber: v.plate_number }));
}

export async function createVehicle(input: { model: string | null; plateNumber: string }): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { count } = await supabase.from("company_vehicles").select("id", { count: "exact", head: true });
  const { error } = await supabase
    .from("company_vehicles")
    .insert({ model: input.model, plate_number: input.plateNumber, sort_order: count ?? 0 });

  if (error) {
    throw new Error(`회사 차량 등록 실패: ${error.message}`);
  }
}

export async function updateVehicle(id: string, input: { model: string | null; plateNumber: string }): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("company_vehicles")
    .update({ model: input.model, plate_number: input.plateNumber })
    .eq("id", id);

  if (error) {
    throw new Error(`회사 차량 수정 실패: ${error.message}`);
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("company_vehicles").delete().eq("id", id);

  if (error) {
    throw new Error(`회사 차량 삭제 실패: ${error.message}`);
  }
}
