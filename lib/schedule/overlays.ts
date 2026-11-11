// 다른 메뉴의 데이터를 달력에 함께 띄우기 위한 항목 (호스팅·도메인 계약일, 직원 생일, 결재 문서).
import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { enumerateDates, toLunar } from "./calendar";

export type OverlayItem = {
  id: string;
  kind: "hosting" | "birthday" | "leave" | "document";
  date: string;
  title: string;
  detail: string;
  /** 누르면 갈 화면 (결재 문서) */
  href?: string;
};

const HOSTING_DATE_COLUMNS = [
  { column: "hosting_start_date", label: "호스팅 시작" },
  { column: "hosting_end_date", label: "호스팅 만료" },
  { column: "domain_start_date", label: "도메인 시작" },
  { column: "domain_end_date", label: "도메인 만료" },
  { column: "ssl_end_date", label: "SSL 만료" },
] as const;

type HostingRow = { id: string; site_name: string } & Record<string, string | null>;

export async function listHostingOverlays(first: string, last: string): Promise<OverlayItem[]> {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("hosting_sites")
    .select(["id", "site_name", ...HOSTING_DATE_COLUMNS.map((c) => c.column)].join(", "));

  if (error) {
    throw new Error(`호스팅 계약일 조회 실패: ${error.message}`);
  }

  return buildHostingOverlays((data ?? []) as unknown as HostingRow[], first, last);
}

export function buildHostingOverlays(rows: HostingRow[], first: string, last: string): OverlayItem[] {
  return rows.flatMap((row) =>
    HOSTING_DATE_COLUMNS.flatMap(({ column, label }) => {
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

// ── 결재 문서 (양식 메뉴) ───────────────────────────────

type ExpenseReportRow = { id: string; doc_number: string; title: string; drafted_at: string };
type StatementRow = { id: string; written_at: string; total_amount: number | string };

/** 품의서는 기안일에 "품의서 번호 · 제목", 경비내역서는 작성일에 "경비내역서 · 합계" 로 표시한다. */
export function buildDocumentOverlays(reports: ExpenseReportRow[], statements: StatementRow[]): OverlayItem[] {
  return [
    ...reports.map((r) => ({
      id: `doc-expense-${r.id}`,
      kind: "document" as const,
      date: r.drafted_at,
      title: `품의서 ${r.doc_number} · ${r.title}`,
      detail: "품의서",
      href: `/forms/expense/${r.id}`,
    })),
    ...statements.map((s) => ({
      id: `doc-statement-${s.id}`,
      kind: "document" as const,
      date: s.written_at,
      title: `경비내역서 · ${(Number(s.total_amount) || 0).toLocaleString("ko-KR")}원`,
      detail: "경비내역서",
      href: `/forms/statement/${s.id}`,
    })),
  ];
}

/** 기간 안의 품의서·경비내역서. 한쪽 표를 못 읽어도 다른 쪽은 보여준다. */
export async function listDocumentOverlays(first: string, last: string): Promise<OverlayItem[]> {
  const supabase = createSupabaseServiceClient();
  const [reports, statements] = await Promise.all([
    supabase
      .from("expense_reports")
      .select("id, doc_number, title, drafted_at")
      .gte("drafted_at", first)
      .lte("drafted_at", last),
    supabase
      .from("expense_statements")
      .select("id, written_at, total_amount")
      .gte("written_at", first)
      .lte("written_at", last),
  ]);
  if (reports.error) console.error("[calendar] 품의서 조회 실패:", reports.error.message);
  if (statements.error) console.error("[calendar] 경비내역서 조회 실패:", statements.error.message);
  return buildDocumentOverlays(
    (reports.data ?? []) as ExpenseReportRow[],
    (statements.data ?? []) as StatementRow[]
  );
}
