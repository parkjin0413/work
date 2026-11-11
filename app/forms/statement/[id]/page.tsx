export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseStatement, getStampUrl } from "@/lib/forms/formsStore";
import { formatWrittenAt } from "@/lib/forms/statement";
import { deleteExpenseStatementAction } from "../../actions";
import { DocumentToolbar } from "../../DocumentToolbar";
import { StatementPaper } from "../../StatementPaper";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ExpenseStatementPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [statement, stampUrl] = await Promise.all([
    withRetry(() => getExpenseStatement(params.id), "forms/statement/view"),
    getStampUrl(),
  ]);
  if (!statement) notFound();

  return (
    <>
      <DocumentToolbar
        editHref={`/forms/statement/${statement.id}/edit`}
        onDelete={deleteExpenseStatementAction.bind(null, statement.id)}
        label={`경비내역서 (${formatWrittenAt(statement.writtenAt)} 작성)`}
      />
      <StatementPaper
        drafterName={statement.drafterName}
        drafterPosition={statement.drafterPosition}
        writtenAt={statement.writtenAt}
        fuelPrice={statement.fuelPrice}
        rows={statement.rows}
        totalAmount={statement.totalAmount}
        stampUrl={stampUrl}
      />
    </>
  );
}
