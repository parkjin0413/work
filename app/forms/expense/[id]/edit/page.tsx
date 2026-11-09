export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseReport } from "@/lib/forms/formsStore";
import { updateExpenseReportAction } from "../../../actions";
import { ExpenseForm } from "../../../ExpenseForm";
import { loadFormContext } from "../../../loadFormContext";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditExpenseReportPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [report, { candidates, stampUrl }] = await Promise.all([
    withRetry(() => getExpenseReport(params.id), "forms/expense/edit"),
    loadFormContext(),
  ]);
  if (!report) notFound();

  return (
    <ExpenseForm
      mode="edit"
      action={updateExpenseReportAction.bind(null, report.id)}
      // 기안자 정보는 처음 작성할 때 그대로 둔다.
      drafter={{
        name: report.drafterName,
        department: report.department,
        position: report.drafterPosition,
        phone: "",
      }}
      candidates={candidates}
      stampUrl={stampUrl}
      cancelHref={`/forms/expense/${report.id}`}
      docNumber={report.docNumber}
      initial={{
        draftedAt: report.draftedAt,
        title: report.title,
        content: report.content,
        items: report.items.map((item) => ({
          description: item.description,
          vendor: item.vendor,
          amount: String(item.amount),
        })),
        consultations: report.consultations,
        instructions: report.instructions,
        approverIds: report.approvers.map((a) => a.employeeId ?? ""),
        attachmentTypes: report.attachmentTypes,
        attachmentOther: report.attachmentOther,
      }}
    />
  );
}
