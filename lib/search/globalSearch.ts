import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { getAllProducts } from "@/lib/products/productsStore";
import { labelToSlug } from "@/lib/products/categories";
import { getMondayOfISO } from "@/lib/tasks/week";

import type { SearchHit } from "./types";

export type { SearchHit } from "./types";

const PER_GROUP = 6;

function escapeLike(value: string): string {
  return value.replace(/[\\%_,()]/g, (ch) => "\\" + ch);
}

const dot = (iso: string) => iso.replace(/-/g, ".");

/** 한 묶음이 실패해도 나머지 결과는 보여준다 */
async function safe(label: string, run: () => Promise<SearchHit[]>): Promise<SearchHit[]> {
  try {
    return await run();
  } catch (error) {
    console.error(`[search] ${label} 실패:`, error);
    return [];
  }
}

/**
 * 메뉴 전체에서 이름·제목으로 찾는다. 비밀번호 같은 민감한 값은 찾지도, 돌려주지도 않는다.
 * 각 묶음 최대 6건.
 */
export async function searchEverything(rawQuery: string): Promise<SearchHit[]> {
  const query = rawQuery.trim().slice(0, 50);
  if (!query) return [];
  const like = `%${escapeLike(query)}%`;
  const lower = query.toLowerCase();
  const supabase = createSupabaseServiceClient();

  const groups = await Promise.all([
    safe("업무", async () => {
      const { data, error } = await supabase
        .from("task_notes")
        .select("id, body, work_date")
        .not("work_date", "is", null)
        .ilike("body", like)
        .order("work_date", { ascending: false })
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "업무" as const,
        title: r.body as string,
        detail: dot(r.work_date as string),
        href: `/tasks?week=${getMondayOfISO(r.work_date as string)}`,
      }));
    }),
    safe("프로젝트", async () => {
      const { data, error } = await supabase.from("tasks")
        .select("id, name")
        .is("template_id", null)
        .is("week_start", null)
        .ilike("name", like)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "업무" as const,
        title: r.name as string,
        detail: "프로젝트",
        href: `/tasks?project=${r.id}`,
      }));
    }),
    safe("일정", async () => {
      const { data, error } = await supabase
        .from("schedules")
        .select("id, title, category, start_date")
        .or(`title.ilike.${like},memo.ilike.${like}`)
        .order("start_date", { ascending: false })
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => {
        const date = r.start_date as string;
        return {
          group: "일정" as const,
          title: r.title as string,
          detail: `${r.category} · ${dot(date)}`,
          href: `/calendar?ym=${date.slice(0, 7)}&date=${date}`,
        };
      });
    }),
    safe("양식", async () => {
      const { data, error } = await supabase
        .from("expense_reports")
        .select("id, title, doc_number, drafted_at")
        .or(`title.ilike.${like},doc_number.ilike.${like}`)
        .order("drafted_at", { ascending: false })
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "양식" as const,
        title: r.title as string,
        detail: `품의서 ${r.doc_number} · ${dot(r.drafted_at as string)}`,
        href: `/forms/expense/${r.id}`,
      }));
    }),
    safe("계정", async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, url, username")
        .or(`name.ilike.${like},url.ilike.${like},username.ilike.${like}`)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "어카운트" as const,
        title: r.name as string,
        detail: (r.username as string) || null,
        href: r.url as string,
      }));
    }),
    safe("즐겨찾기", async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("id, name, url")
        .or(`name.ilike.${like},url.ilike.${like}`)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "어카운트" as const,
        title: r.name as string,
        detail: "즐겨찾기",
        href: r.url as string,
      }));
    }),
    safe("거래처", async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, company_name, representative")
        .or(`company_name.ilike.${like},representative.ilike.${like}`)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "회사" as const,
        title: r.company_name as string,
        detail: r.representative ? `대표 ${r.representative}` : "회사",
        href: "/company",
      }));
    }),
    safe("직원", async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, position, phone")
        .ilike("name", like)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "회사" as const,
        title: [r.name, r.position].filter(Boolean).join(" "),
        detail: (r.phone as string) || "직원",
        href: "/company#employees",
      }));
    }),
    safe("웹", async () => {
      const { data, error } = await supabase
        .from("hosting_sites")
        .select("id, site_name, site_url")
        .or(`site_name.ilike.${like},site_url.ilike.${like}`)
        .limit(PER_GROUP);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        group: "웹" as const,
        title: (r.site_name as string) || (r.site_url as string),
        detail: (r.site_url as string) || null,
        href: "/hosting",
      }));
    }),
    safe("제품", async () =>
      getAllProducts()
        .filter((p) => [p.name, p.productType, p.summary].some((v) => v && v.toLowerCase().includes(lower)))
        .slice(0, PER_GROUP)
        .map((p) => ({
          group: "제품" as const,
          title: p.name,
          detail: [p.category, p.productType].filter(Boolean).join(" · "),
          href: `/products/${labelToSlug(p.category)}`,
        })),
    ),
  ]);

  return groups.flat();
}
