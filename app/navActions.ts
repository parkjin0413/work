"use server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { listHostingSites } from "@/lib/hosting/hostingStore";
import { siteExpiries } from "@/app/hosting/expiry";
import { searchEverything } from "@/lib/search/globalSearch";
import type { SearchHit } from "@/lib/search/types";
import { getKstTodayISO } from "@/lib/tasks/week";

/** 상단 메뉴 알림: 웹(호스팅·도메인·SSL) 만료가 지났거나 30일 안인 건수 */
export async function getNavAlertsAction(): Promise<{ hosting: number }> {
  await requireAdmin();
  try {
    const today = getKstTodayISO();
    const sites = await listHostingSites();
    const hosting = sites.flatMap((site) => siteExpiries(site, today)).filter((e) => e.level !== "ok").length;
    return { hosting };
  } catch (error) {
    console.error("[nav] 만료 알림 조회 실패:", error);
    return { hosting: 0 };
  }
}

/** 통합 검색 (Ctrl+K) */
export async function searchEverythingAction(query: string): Promise<SearchHit[]> {
  await requireAdmin();
  if (typeof query !== "string") return [];
  return searchEverything(query);
}
