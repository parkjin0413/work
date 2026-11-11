export const dynamic = "force-dynamic";

import { getKstTodayISO } from "@/lib/tasks/week";
import { listStatementSuggestions } from "@/lib/forms/formsStore";
import { previousMonthStart } from "@/lib/forms/statement";
import { createExpenseStatementAction } from "../../actions";
import { StatementForm } from "../../StatementForm";
import { loadFormContext, NO_STAMP_MESSAGE } from "../../loadFormContext";
import { StampNotice } from "../../StampNotice";

export default async function NewExpenseStatementPage() {
  const [{ drafter, stampUrl }, suggestions] = await Promise.all([loadFormContext(), listStatementSuggestions()]);
  const today = getKstTodayISO();

  return (
    <>
      {!stampUrl && <StampNotice message={NO_STAMP_MESSAGE} />}
      <StatementForm
        mode="create"
        action={createExpenseStatementAction}
        drafter={drafter}
        stampUrl={stampUrl}
        cancelHref="/forms"
        suggestions={suggestions}
        // 경비내역서는 보통 지난달 것을 쓰므로 첫 줄 날짜를 지난달 1일로 시작한다
        initial={{
          writtenAt: today,
          fuelPrice: "",
          rows: [
            { kind: "general", date: previousMonthStart(today), description: "", amount: "", distance: "", note: "" },
          ],
        }}
      />
    </>
  );
}
