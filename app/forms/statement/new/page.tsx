export const dynamic = "force-dynamic";

import { getKstTodayISO } from "@/lib/tasks/week";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseStatement, listStatementSuggestions } from "@/lib/forms/formsStore";
import { formatWrittenAt, monthsBetween, previousMonthStart, shiftMonthsISO } from "@/lib/forms/statement";
import { createExpenseStatementAction } from "../../actions";
import { StatementForm } from "../../StatementForm";
import { loadFormContext, NO_STAMP_MESSAGE } from "../../loadFormContext";
import { StampNotice } from "../../StampNotice";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * ?from=<경비내역서 id> 면 그 내역서를 복사해 새로 쓴다. 작성일은 오늘이고,
 * 행 날짜는 원본 작성일과 오늘의 달 차이만큼 옮긴다 (10월에 쓴 9월 내역 → 11월에 쓰는 10월 내역).
 */
export default async function NewExpenseStatementPage({ searchParams }: { searchParams: { from?: string } }) {
  const fromId = searchParams.from && UUID.test(searchParams.from) ? searchParams.from : null;
  const [{ drafter, stampUrl }, suggestions, source] = await Promise.all([
    loadFormContext(),
    listStatementSuggestions(),
    fromId ? withRetry(() => getExpenseStatement(fromId), "forms/statement/copy").catch(() => null) : null,
  ]);
  const today = getKstTodayISO();
  const shift = source ? monthsBetween(source.writtenAt, today) : 0;

  return (
    <>
      {!stampUrl && <StampNotice message={NO_STAMP_MESSAGE} />}
      {source ? (
        <p className="no-print mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
          {formatWrittenAt(source.writtenAt)}에 작성한 경비내역서를 복사했습니다.
          {shift !== 0 ? ` 날짜는 ${Math.abs(shift)}달 ${shift > 0 ? "뒤로" : "앞으로"} 옮겼으니 실제 날짜와 금액을 확인해주세요.` : ""}
        </p>
      ) : null}
      <StatementForm
        mode="create"
        action={createExpenseStatementAction}
        drafter={drafter}
        stampUrl={stampUrl}
        cancelHref="/forms"
        suggestions={suggestions}
        // 경비내역서는 보통 지난달 것을 쓰므로 첫 줄 날짜를 지난달 1일로 시작한다
        initial={
          source
            ? {
                writtenAt: today,
                fuelPrice: source.fuelPrice ? String(source.fuelPrice) : "",
                rows: source.rows.map((row) => ({
                  kind: row.kind,
                  date: row.date ? shiftMonthsISO(row.date, shift) : row.date,
                  description: row.description,
                  amount: row.kind === "car" ? "" : String(row.amount),
                  distance: row.distance != null ? String(row.distance) : "",
                  note: row.kind === "car" ? "" : row.note,
                })),
              }
            : {
                writtenAt: today,
                fuelPrice: "",
                rows: [
                  {
                    kind: "general",
                    date: previousMonthStart(today),
                    description: "",
                    amount: "",
                    distance: "",
                    note: "",
                  },
                ],
              }
        }
      />
    </>
  );
}
