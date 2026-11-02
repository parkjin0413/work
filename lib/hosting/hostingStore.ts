import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { encryptToken, decryptToken } from "@/lib/crypto/tokenCipher";
import { ALL_FIELDS, type HostingSite, type HostingValues } from "./fields";

const TABLE = "hosting_sites";
const SELECT_COLUMNS = ["id", ...ALL_FIELDS.map((field) => field.column)].join(", ");
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

type Row = Record<string, unknown> & { id: string };

function toSite(row: Row): HostingSite {
  const values: HostingValues = {};

  for (const field of ALL_FIELDS) {
    const raw = row[field.column];

    if (field.type === "ssl") {
      values[field.key] = raw === true ? "yes" : raw === false ? "no" : "";
    } else if (field.type === "password") {
      values[field.key] = typeof raw === "string" && raw ? decryptToken(raw) : "";
    } else {
      values[field.key] = typeof raw === "string" ? raw : "";
    }
  }

  return { id: row.id, values };
}

function toRow(values: HostingValues): Record<string, unknown> {
  const row: Record<string, unknown> = {};

  for (const field of ALL_FIELDS) {
    const value = (values[field.key] ?? "").trim();

    if (field.type === "ssl") {
      row[field.column] = value === "yes" ? true : value === "no" ? false : null;
    } else if (field.type === "password") {
      row[field.column] = value ? encryptToken(value) : null;
    } else if (field.type === "date") {
      if (value && !DATE_PATTERN.test(value)) {
        throw new Error(`${field.label} 날짜 형식이 올바르지 않습니다.`);
      }
      row[field.column] = value || null;
    } else {
      row[field.column] = value || null;
    }
  }

  if (!row.site_name) {
    throw new Error("홈페이지 이름을 입력해주세요.");
  }

  return row;
}

export async function listHostingSites(): Promise<HostingSite[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`호스팅 정보 조회 실패: ${error.message}`);
  }

  return ((data ?? []) as unknown as Row[]).map(toSite);
}

export async function createHostingSite(values: HostingValues): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const row = toRow(values);

  // 새 항목은 맨 뒤에 붙인다.
  const { count } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  row.sort_order = count ?? 0;

  const { error } = await supabase.from(TABLE).insert(row);
  if (error) {
    throw new Error(`호스팅 정보 등록 실패: ${error.message}`);
  }
}

export async function updateHostingSite(id: string, values: HostingValues): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from(TABLE).update(toRow(values)).eq("id", id);

  if (error) {
    throw new Error(`호스팅 정보 수정 실패: ${error.message}`);
  }
}

export async function deleteHostingSite(id: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(`호스팅 정보 삭제 실패: ${error.message}`);
  }
}

export async function reorderHostingSites(orderedIds: string[]): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from(TABLE).update({ sort_order: index }).eq("id", id))
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`호스팅 순서 변경 실패: ${failed.error.message}`);
  }
}
