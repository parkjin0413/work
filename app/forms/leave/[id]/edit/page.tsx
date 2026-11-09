export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getLeaveRequest } from "@/lib/forms/formsStore";
import { updateLeaveRequestAction } from "../../../actions";
import { LeaveForm } from "../../../LeaveForm";
import { loadFormContext } from "../../../loadFormContext";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditLeaveRequestPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [leave, { candidates, stampUrl }] = await Promise.all([
    withRetry(() => getLeaveRequest(params.id), "forms/leave/edit"),
    loadFormContext(),
  ]);
  if (!leave) notFound();

  return (
    <LeaveForm
      mode="edit"
      action={updateLeaveRequestAction.bind(null, leave.id)}
      // 기안자 정보는 처음 작성할 때 그대로 둔다.
      drafter={{ name: leave.drafterName, department: leave.department, position: leave.drafterPosition, phone: "" }}
      candidates={candidates}
      stampUrl={stampUrl}
      cancelHref={`/forms/leave/${leave.id}`}
      docNumber={leave.docNumber}
      initial={{
        draftedAt: leave.draftedAt,
        startDate: leave.startDate,
        endDate: leave.endDate,
        days: String(leave.days),
        leaveType: leave.leaveType,
        reason: leave.reason,
        substituteJobTitle: leave.substituteJobTitle,
        substituteName: leave.substituteName,
        leaveBalance: leave.leaveBalance,
        approverIds: leave.approvers.map((a) => a.employeeId ?? ""),
      }}
    />
  );
}
