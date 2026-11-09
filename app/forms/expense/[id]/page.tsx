export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseReport, getStampUrl } from "@/lib/forms/formsStore";
import { deleteExpenseReportAction } from "../../actions";
import { DocumentToolbar } from "../../DocumentToolbar";
import { ExpensePaper } from "../../ExpensePaper";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ExpenseReportPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [report, stampUrl] = await Promise.all([
    withRetry(() => getExpenseReport(params.id), "forms/expense/view"),
    getStampUrl(),
  ]);
  if (!report) notFound();

  return (
    <>
      <DocumentToolbar
        editHref={`/forms/expense/${report.id}/edit`}
        onDelete={deleteExpenseReportAction.bind(null, report.id)}
        label={`품의서 ${report.docNumber}`}
      />
      <ExpensePaper
        docNumber={report.docNumber}
        drafterName={report.drafterName}
        drafterPosition={report.drafterPosition}
        department={report.department}
        draftedAt={report.draftedAt}
        title={report.title}
        content={report.content}
        items={report.items}
        totalAmount={report.totalAmount}
        consultations={report.consultations}
        instructions={report.instructions}
        approvers={report.approvers}
        attachmentTypes={report.attachmentTypes}
        attachmentOther={report.attachmentOther}
        stampUrl={stampUrl}
      />
    </>
  );
}
