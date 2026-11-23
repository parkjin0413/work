export const dynamic = "force-dynamic";

import { getKstTodayISO } from "@/lib/tasks/week";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseReport } from "@/lib/forms/formsStore";
import { createExpenseReportAction } from "../../actions";
import { ExpenseForm } from "../../ExpenseForm";
import { loadFormContext, NO_STAMP_MESSAGE } from "../../loadFormContext";
import { StampNotice } from "../../StampNotice";

const UUID = /^[0-9a-f-]{36}$/i;

/** ?from=<품의서 id> 면 그 품의서 내용을 복사해 새로 쓴다 (기안일은 오늘, 문서번호는 새로). */
export default async function NewExpenseReportPage({ searchParams }: { searchParams: { from?: string } }) {
  const fromId = searchParams.from && UUID.test(searchParams.from) ? searchParams.from : null;
  const [{ drafter, candidates, stampUrl }, source] = await Promise.all([
    loadFormContext(),
    fromId ? withRetry(() => getExpenseReport(fromId), "forms/expense/copy").catch(() => null) : null,
  ]);
  // 결재자는 보통 대표이사 한 분이라 처음부터 골라 둔다.
  const ceo = candidates.find((c) => c.position === "대표이사");

  return (
    <>
      {!stampUrl && <StampNotice message={NO_STAMP_MESSAGE} />}
      {source ? (
        <p className="no-print mb-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm text-foreground">
          <b>{source.docNumber}</b> 품의서를 복사했습니다. 기안일은 오늘, 문서번호는 저장할 때 새로 매겨집니다.
        </p>
      ) : null}
      <ExpenseForm
        mode="create"
        action={createExpenseReportAction}
        drafter={drafter}
        candidates={candidates}
        stampUrl={stampUrl}
        cancelHref="/forms"
        initial={
          source
            ? {
                draftedAt: getKstTodayISO(),
                title: source.title,
                content: source.content,
                items: source.items.map((item) => ({
                  description: item.description,
                  vendor: item.vendor,
                  amount: String(item.amount),
                })),
                consultations: source.consultations,
                instructions: source.instructions,
                approverIds: source.approvers.map((a) => a.employeeId ?? "").filter(Boolean),
                attachmentTypes: source.attachmentTypes,
                attachmentOther: source.attachmentOther,
              }
            : {
                draftedAt: getKstTodayISO(),
                title: "",
                content: "",
                items: [],
                consultations: [],
                instructions: "",
                approverIds: ceo ? [ceo.id] : [],
                attachmentTypes: [],
                attachmentOther: "",
              }
        }
      />
    </>
  );
}
