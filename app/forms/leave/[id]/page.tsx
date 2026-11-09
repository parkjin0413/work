export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { withRetry } from "@/lib/supabase/withRetry";
import { getLeaveRequest, getStampUrl } from "@/lib/forms/formsStore";
import { deleteLeaveRequestAction } from "../../actions";
import { DocumentToolbar } from "../../DocumentToolbar";
import { LeavePaper } from "../../LeavePaper";

const UUID = /^[0-9a-f-]{36}$/i;

export default async function LeaveRequestPage({ params }: { params: { id: string } }) {
  if (!UUID.test(params.id)) notFound();
  const [leave, stampUrl] = await Promise.all([
    withRetry(() => getLeaveRequest(params.id), "forms/leave/view"),
    getStampUrl(),
  ]);
  if (!leave) notFound();

  return (
    <>
      <DocumentToolbar
        editHref={`/forms/leave/${leave.id}/edit`}
        onDelete={deleteLeaveRequestAction.bind(null, leave.id)}
        label={`휴가신청서 ${leave.docNumber}`}
      />
      <LeavePaper
        docNumber={leave.docNumber}
        drafterName={leave.drafterName}
        drafterPosition={leave.drafterPosition}
        department={leave.department}
        draftedAt={leave.draftedAt}
        startDate={leave.startDate}
        endDate={leave.endDate}
        days={leave.days}
        leaveType={leave.leaveType}
        reason={leave.reason}
        substituteJobTitle={leave.substituteJobTitle}
        substituteName={leave.substituteName}
        leaveBalance={leave.leaveBalance}
        approvers={leave.approvers}
        stampUrl={stampUrl}
      />
    </>
  );
}
