import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

const BUCKET = "partner-files";

export type Partner = {
  id: string;
  companyName: string;
  representative: string | null;
  address: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  registrationFileName: string | null;
  registrationFileUrl: string | null;
  registrationFileDownloadUrl: string | null;
};

type PartnerRow = {
  id: string;
  company_name: string;
  representative: string | null;
  address: string | null;
  business_number: string | null;
  phone: string | null;
  email: string | null;
  registration_file_path: string | null;
  registration_file_name: string | null;
};

function toPartner(row: PartnerRow): Partner {
  const supabase = createSupabaseServiceClient();

  let registrationFileUrl: string | null = null;
  let registrationFileDownloadUrl: string | null = null;
  if (row.registration_file_path) {
    registrationFileUrl = supabase.storage.from(BUCKET).getPublicUrl(row.registration_file_path).data
      .publicUrl;
    registrationFileDownloadUrl = supabase.storage
      .from(BUCKET)
      .getPublicUrl(row.registration_file_path, { download: row.registration_file_name ?? true }).data
      .publicUrl;
  }

  return {
    id: row.id,
    companyName: row.company_name,
    representative: row.representative,
    address: row.address,
    businessNumber: row.business_number,
    phone: row.phone,
    email: row.email,
    registrationFileName: row.registration_file_name,
    registrationFileUrl,
    registrationFileDownloadUrl,
  };
}

export async function listPartners(): Promise<Partner[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("partners")
    .select(
      "id, company_name, representative, address, business_number, phone, email, registration_file_path, registration_file_name"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`거래처 조회 실패: ${error.message}`);
  }

  return (data ?? []).map(toPartner);
}

async function uploadRegistrationFile(file: File): Promise<{ path: string; name: string }> {
  const supabase = createSupabaseServiceClient();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(`사업자등록증 업로드 실패: ${error.message}`);
  }

  return { path, name: file.name };
}

async function removeRegistrationFile(path: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(BUCKET).remove([path]);
}

export async function createPartner(input: {
  companyName: string;
  representative: string | null;
  address: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  registrationFile: File | null;
}): Promise<void> {
  const supabase = createSupabaseServiceClient();

  let filePath: string | null = null;
  let fileName: string | null = null;
  if (input.registrationFile && input.registrationFile.size > 0) {
    const uploaded = await uploadRegistrationFile(input.registrationFile);
    filePath = uploaded.path;
    fileName = uploaded.name;
  }

  const { error } = await supabase.from("partners").insert({
    company_name: input.companyName,
    representative: input.representative,
    address: input.address,
    business_number: input.businessNumber,
    phone: input.phone,
    email: input.email,
    registration_file_path: filePath,
    registration_file_name: fileName,
  });

  if (error) {
    if (filePath) await removeRegistrationFile(filePath);
    throw new Error(`거래처 등록 실패: ${error.message}`);
  }
}

export async function updatePartner(
  id: string,
  input: {
    companyName: string;
    representative: string | null;
    address: string | null;
    businessNumber: string | null;
    phone: string | null;
    email: string | null;
    registrationFile: File | null;
    removeRegistrationFile: boolean;
  }
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("partners")
    .select("registration_file_path")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`거래처 조회 실패: ${fetchError.message}`);
  }

  let filePath: string | null = existing?.registration_file_path ?? null;
  let fileName: string | null | undefined; // undefined = 파일 관련 변경 없음

  if (input.registrationFile && input.registrationFile.size > 0) {
    const uploaded = await uploadRegistrationFile(input.registrationFile);
    if (filePath) await removeRegistrationFile(filePath);
    filePath = uploaded.path;
    fileName = uploaded.name;
  } else if (input.removeRegistrationFile && filePath) {
    await removeRegistrationFile(filePath);
    filePath = null;
    fileName = null;
  }

  const updatePayload: Record<string, unknown> = {
    company_name: input.companyName,
    representative: input.representative,
    address: input.address,
    business_number: input.businessNumber,
    phone: input.phone,
    email: input.email,
    registration_file_path: filePath,
  };
  if (fileName !== undefined) {
    updatePayload.registration_file_name = fileName;
  }

  const { error } = await supabase.from("partners").update(updatePayload).eq("id", id);

  if (error) {
    throw new Error(`거래처 수정 실패: ${error.message}`);
  }
}

export async function deletePartner(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("partners")
    .select("registration_file_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("partners").delete().eq("id", id);

  if (error) {
    throw new Error(`거래처 삭제 실패: ${error.message}`);
  }

  if (existing?.registration_file_path) {
    await removeRegistrationFile(existing.registration_file_path);
  }
}

export async function reorderPartners(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from("partners").update({ sort_order: index }).eq("id", id))
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`거래처 순서 변경 실패: ${failed.error.message}`);
  }
}
