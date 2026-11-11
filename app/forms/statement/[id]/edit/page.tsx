export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getExpenseStatement, getStampUrl, listStatementSuggestions } from "@/lib/forms/formsStore";
import { updateExpenseStatementAction } from "../../../actions";
import { StatementForm } from "../../../StatementForm";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditExpenseStatementPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [statement, stampUrl, suggestions] = await Promise.all([
    withRetry(() => getExpenseStatement(params.id), "forms/statement/edit"),
    getStampUrl(),
    listStatementSuggestions(),
  ]);
  if (!statement) notFound();

  return (
    <StatementForm
      mode="edit"
      action={updateExpenseStatementAction.bind(null, statement.id)}
      // 작성자 정보는 처음 작성할 때 그대로 둔다.
      drafter={{ name: statement.drafterName, department: "", position: statement.drafterPosition, phone: "" }}
      stampUrl={stampUrl}
      suggestions={suggestions}
      cancelHref={`/forms/statement/${statement.id}`}
      initial={{
        writtenAt: statement.writtenAt,
        fuelPrice: statement.fuelPrice ? String(statement.fuelPrice) : "",
        rows: statement.rows.map((row) => ({
          kind: row.kind,
          date: row.date,
          description: row.description,
          amount: row.kind === "car" ? "" : String(row.amount),
          distance: row.distance != null ? String(row.distance) : "",
          note: row.kind === "car" ? "" : row.note,
        })),
      }}
    />
  );
}
