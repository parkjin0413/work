// 다른 메뉴의 데이터를 달력에 함께 띄우기 위한 항목 (호스팅 만료일, 직원 생일).
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { enumerateDates, toLunar } from "./calendar";

export type OverlayItem = {
  id: string;
  kind: "hosting" | "birthday";
  date: string;
  title: string;
  detail: string;
};

const HOSTING_EXPIRY_COLUMNS = [
  { column: "hosting_end_date", label: "호스팅 만료" },
  { column: "domain_end_date", label: "도메인 만료" },
  { column: "ssl_end_date", label: "SSL 만료" },
] as const;

type HostingRow = { id: string; site_name: string } & Record<string, string | null>;

export async function listHostingOverlays(first: string, last: string): Promise<OverlayItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("hosting_sites")
    .select(["id", "site_name", ...HOSTING_EXPIRY_COLUMNS.map((c) => c.column)].join(", "));

  if (error) {
    throw new Error(`호스팅 만료일 조회 실패: ${error.message}`);
  }

  return buildHostingOverlays((data ?? []) as unknown as HostingRow[], first, last);
}

export function buildHostingOverlays(rows: HostingRow[], first: string, last: string): OverlayItem[] {
  return rows.flatMap((row) =>
    HOSTING_EXPIRY_COLUMNS.flatMap(({ column, label }) => {
      const date = row[column];
      if (!date || date < first || date > last) return [];
      return [{ id: `hosting-${row.id}-${column}`, kind: "hosting" as const, date, title: `${label} · ${row.site_name}`, detail: label }];
    })
  );
}

type BirthdayRow = {
  id: string;
  name: string;
  birthday_month: number | null;
  birthday_day: number | null;
  birthday_calendar: string | null;
};

export async function listBirthdayOverlays(first: string, last: string): Promise<OverlayItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("employees")
    .select("id, name, birthday_month, birthday_day, birthday_calendar")
    .not("birthday_month", "is", null)
    .not("birthday_day", "is", null);

  if (error) {
    throw new Error(`직원 생일 조회 실패: ${error.message}`);
  }

  return buildBirthdayOverlays((data ?? []) as BirthdayRow[], first, last);
}

/** 기간 안의 날짜마다 양력·음력 월/일을 구해서 생일과 맞춰본다. 음력 생일은 윤달이 아닌 달에만 표시한다. */
export function buildBirthdayOverlays(rows: BirthdayRow[], first: string, last: string): OverlayItem[] {
  const items: OverlayItem[] = [];

  for (const date of enumerateDates(first, last)) {
    const solarMonth = Number(date.slice(5, 7));
    const solarDay = Number(date.slice(8, 10));
    const lunar = toLunar(date);

    for (const row of rows) {
      if (!row.birthday_month || !row.birthday_day) continue;
      const isLunar = row.birthday_calendar === "lunar";
      const matches = isLunar
        ? !lunar.isLeap && lunar.month === row.birthday_month && lunar.day === row.birthday_day
        : solarMonth === row.birthday_month && solarDay === row.birthday_day;
      if (!matches) continue;

      items.push({
        id: `birthday-${row.id}-${date}`,
        kind: "birthday",
        date,
        title: `생일 · ${row.name}`,
        detail: isLunar ? `음력 ${row.birthday_month}월 ${row.birthday_day}일` : "양력",
      });
    }
  }

  return items;
}
