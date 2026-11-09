export const dynamic = "force-dynamic";

import { getKstTodayISO } from "@/lib/tasks/week";
import { createExpenseReportAction } from "../../actions";
import { ExpenseForm } from "../../ExpenseForm";
import { loadFormContext, NO_STAMP_MESSAGE } from "../../loadFormContext";
import { StampNotice } from "../../StampNotice";

export default async function NewExpenseReportPage() {
  const { drafter, candidates, stampUrl } = await loadFormContext();
  // 결재자는 보통 대표이사 한 분이라 처음부터 골라 둔다.
  const ceo = candidates.find((c) => c.position === "대표이사");

  return (
    <>
      {!stampUrl && <StampNotice message={NO_STAMP_MESSAGE} />}
      <ExpenseForm
        mode="create"
        action={createExpenseReportAction}
        drafter={drafter}
        candidates={candidates}
        stampUrl={stampUrl}
        cancelHref="/forms"
        initial={{
          draftedAt: getKstTodayISO(),
          title: "",
          content: "",
          items: [],
          consultations: [],
          instructions: "",
          approverIds: ceo ? [ceo.id] : [],
          attachmentTypes: [],
          attachmentOther: "",
        }}
      />
    </>
  );
}
