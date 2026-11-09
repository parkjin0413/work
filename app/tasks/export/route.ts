import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { toWorkItemsCsv } from "@/lib/tasks/exportCsv";
import { getKstTodayISO } from "@/lib/tasks/week";
import { listAllDatedWorkItems } from "@/lib/tasks/workItems";

export const dynamic = "force-dynamic";

/** 업무 기록 전체를 CSV 로 내려받는다 (엑셀에서 바로 열림). */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const csv = toWorkItemsCsv(await listAllDatedWorkItems());
    const filename = `업무기록_${getKstTodayISO()}.csv`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="work-log.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[tasks/export] 실패:", error);
    return NextResponse.json({ error: "기록을 내려받지 못했습니다." }, { status: 500 });
  }
}
