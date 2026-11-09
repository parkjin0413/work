export const dynamic = "force-dynamic";

import { getKstTodayISO } from "@/lib/tasks/week";
import { EMPTY_LEAVE_BALANCE_ENTRY } from "@/lib/forms/types";
import { createLeaveRequestAction } from "../../actions";
import { LeaveForm } from "../../LeaveForm";
import { loadFormContext, NO_STAMP_MESSAGE } from "../../loadFormContext";
import { StampNotice } from "../../StampNotice";

export default async function NewLeaveRequestPage() {
  const { drafter, candidates, stampUrl } = await loadFormContext();
  const today = getKstTodayISO();

  return (
    <>
      {!stampUrl && <StampNotice message={NO_STAMP_MESSAGE} />}
      <LeaveForm
        mode="create"
        action={createLeaveRequestAction}
        drafter={drafter}
        candidates={candidates}
        stampUrl={stampUrl}
        cancelHref="/forms"
        initial={{
          draftedAt: today,
          startDate: today,
          endDate: today,
          days: "",
          leaveType: "",
          reason: "",
          substituteJobTitle: "",
          substituteName: "",
          leaveBalance: { annual: EMPTY_LEAVE_BALANCE_ENTRY, substitute: EMPTY_LEAVE_BALANCE_ENTRY },
          approverIds: [],
        }}
      />
    </>
  );
}
