import { randomUUID } from "crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";

/** 사업자등록증: 공개 버킷 (공개 URL) */
const BUCKET = "partner-files";
/** 통장 사본: 계좌 정보가 있어 비공개 버킷 (1시간짜리 서명 URL) */
const PRIVATE_BUCKET = "partner-private";
const SIGNED_URL_SECONDS = 3600;

export type Partner = {
  id: string;
  companyName: string;
  representative: string | null;
  address: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  registrationFileName: string | null;
  registrationFileUrl: string | null;
  registrationFileDownloadUrl: string | null;
  bankbookFileName: string | null;
  bankbookFileUrl: string | null;
  bankbookFileDownloadUrl: string | null;
};

type PartnerRow = {
  id: string;
  company_name: string;
  representative: string | null;
  address: string | null;
  business_number: string | null;
  phone: string | null;
  email: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_holder: string | null;
  registration_file_path: string | null;
  registration_file_name: string | null;
  bankbook_file_path: string | null;
  bankbook_file_name: string | null;
};

/** 통장 사본 보기·다운로드용 서명 URL. 실패하면 null (카드는 그대로 보여준다). */
async function signedBankbookUrls(
  path: string,
  fileName: string | null
): Promise<{ view: string | null; download: string | null }> {
  const supabase = createSupabaseServiceClient();
  const [view, download] = await Promise.all([
    supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS),
    supabase.storage.from(PRIVATE_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS, { download: fileName ?? true }),
  ]);
  if (view.error) console.error("[partners] 통장 사본 주소 만들기 실패:", view.error.message);
  return { view: view.data?.signedUrl ?? null, download: download.data?.signedUrl ?? null };
}

async function toPartner(row: PartnerRow): Promise<Partner> {
  const supabase = createSupabaseServiceClient();

  let registrationFileUrl: string | null = null;
  let registrationFileDownloadUrl: string | null = null;
  if (row.registration_file_path) {
    registrationFileUrl = supabase.storage.from(BUCKET).getPublicUrl(row.registration_file_path).data.publicUrl;
    registrationFileDownloadUrl = supabase.storage
      .from(BUCKET)
      .getPublicUrl(row.registration_file_path, { download: row.registration_file_name ?? true }).data.publicUrl;
  }

  const bankbook = row.bankbook_file_path
    ? await signedBankbookUrls(row.bankbook_file_path, row.bankbook_file_name)
    : { view: null, download: null };

  return {
    id: row.id,
    companyName: row.company_name,
    representative: row.representative,
    address: row.address,
    businessNumber: row.business_number,
    phone: row.phone,
    email: row.email,
    bankName: row.bank_name,
    accountNumber: row.account_number,
    accountHolder: row.account_holder,
    registrationFileName: row.registration_file_name,
    registrationFileUrl,
    registrationFileDownloadUrl,
    bankbookFileName: row.bankbook_file_name,
    bankbookFileUrl: bankbook.view,
    bankbookFileDownloadUrl: bankbook.download,
  };
}

const SELECT_COLUMNS =
  "id, company_name, representative, address, business_number, phone, email, bank_name, account_number, account_holder, " +
  "registration_file_path, registration_file_name, bankbook_file_path, bankbook_file_name";

// 0024_partner_bank.sql 실행 전이면 새 열이 없으므로, 예전 열만 읽어 화면은 그대로 보여준다.
const LEGACY_SELECT_COLUMNS =
  "id, company_name, representative, address, business_number, phone, email, registration_file_path, registration_file_name";

export async function listPartners(): Promise<Partner[]> {
  const supabase = createSupabaseServiceClient();
  const query = (columns: string) =>
    supabase
      .from("partners")
      .select(columns)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

  let { data, error } = await query(SELECT_COLUMNS);
  if (error?.code === "42703") {
    console.error("[partners] 0024_partner_bank.sql 미실행 — 은행·통장 사본 없이 표시합니다.");
    ({ data, error } = await query(LEGACY_SELECT_COLUMNS));
  }

  if (error) {
    throw new Error(`거래처 조회 실패: ${error.message}`);
  }

  return Promise.all(
    ((data ?? []) as unknown as Partial<PartnerRow>[]).map((row) =>
      toPartner({
        bank_name: null,
        account_number: null,
        account_holder: null,
        bankbook_file_path: null,
        bankbook_file_name: null,
        ...row,
      } as PartnerRow)
    )
  );
}

type FileKind = "registration" | "bankbook";
const FILE_BUCKETS: Record<FileKind, string> = { registration: BUCKET, bankbook: PRIVATE_BUCKET };
const FILE_LABELS: Record<FileKind, string> = { registration: "사업자등록증", bankbook: "통장 사본" };

async function uploadFile(kind: FileKind, file: File): Promise<{ path: string; name: string }> {
  const supabase = createSupabaseServiceClient();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const path = `${randomUUID()}${ext}`;

  const { error } = await supabase.storage.from(FILE_BUCKETS[kind]).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(`${FILE_LABELS[kind]} 업로드 실패: ${error.message}`);
  }

  return { path, name: file.name };
}

async function removeFile(kind: FileKind, path: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  await supabase.storage.from(FILE_BUCKETS[kind]).remove([path]);
}

type PartnerFields = {
  companyName: string;
  representative: string | null;
  address: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
};

function fieldColumns(input: PartnerFields) {
  return {
    company_name: input.companyName,
    representative: input.representative,
    address: input.address,
    business_number: input.businessNumber,
    phone: input.phone,
    email: input.email,
    bank_name: input.bankName,
    account_number: input.accountNumber,
    account_holder: input.accountHolder,
  };
}

export async function createPartner(
  input: PartnerFields & { registrationFile: File | null; bankbookFile: File | null }
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const registration = input.registrationFile?.size ? await uploadFile("registration", input.registrationFile) : null;
  let bankbook: { path: string; name: string } | null = null;
  try {
    bankbook = input.bankbookFile?.size ? await uploadFile("bankbook", input.bankbookFile) : null;
  } catch (error) {
    if (registration) await removeFile("registration", registration.path);
    throw error;
  }

  const { error } = await supabase.from("partners").insert({
    ...fieldColumns(input),
    registration_file_path: registration?.path ?? null,
    registration_file_name: registration?.name ?? null,
    bankbook_file_path: bankbook?.path ?? null,
    bankbook_file_name: bankbook?.name ?? null,
  });

  if (error) {
    if (registration) await removeFile("registration", registration.path);
    if (bankbook) await removeFile("bankbook", bankbook.path);
    throw new Error(`거래처 등록 실패: ${error.message}`);
  }
}

/** 파일 하나(사업자등록증 또는 통장 사본)의 교체·삭제를 처리하고 바뀐 열을 돌려준다. */
async function replaceFile(
  kind: FileKind,
  currentPath: string | null,
  file: File | null,
  remove: boolean
): Promise<Record<string, string | null>> {
  const pathColumn = `${kind}_file_path`;
  const nameColumn = `${kind}_file_name`;
  if (file && file.size > 0) {
    const uploaded = await uploadFile(kind, file);
    if (currentPath) await removeFile(kind, currentPath);
    return { [pathColumn]: uploaded.path, [nameColumn]: uploaded.name };
  }
  if (remove && currentPath) {
    await removeFile(kind, currentPath);
    return { [pathColumn]: null, [nameColumn]: null };
  }
  return {};
}

export async function updatePartner(
  id: string,
  input: PartnerFields & {
    registrationFile: File | null;
    removeRegistrationFile: boolean;
    bankbookFile: File | null;
    removeBankbookFile: boolean;
  }
): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from("partners")
    .select("registration_file_path, bankbook_file_path")
    .eq("id", id)
    .single();

  if (fetchError) {
    throw new Error(`거래처 조회 실패: ${fetchError.message}`);
  }

  const registrationColumns = await replaceFile(
    "registration",
    existing?.registration_file_path ?? null,
    input.registrationFile,
    input.removeRegistrationFile
  );
  const bankbookColumns = await replaceFile(
    "bankbook",
    existing?.bankbook_file_path ?? null,
    input.bankbookFile,
    input.removeBankbookFile
  );

  const { error } = await supabase
    .from("partners")
    .update({ ...fieldColumns(input), ...registrationColumns, ...bankbookColumns })
    .eq("id", id);

  if (error) {
    throw new Error(`거래처 수정 실패: ${error.message}`);
  }
}

export async function deletePartner(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("partners")
    .select("registration_file_path, bankbook_file_path")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("partners").delete().eq("id", id);

  if (error) {
    throw new Error(`거래처 삭제 실패: ${error.message}`);
  }

  if (existing?.registration_file_path) await removeFile("registration", existing.registration_file_path);
  if (existing?.bankbook_file_path) await removeFile("bankbook", existing.bankbook_file_path);
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
