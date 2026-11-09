import { withRetry } from "@/lib/supabase/withRetry";
import { getDrafterProfile, getStampUrl, listApproverCandidates } from "@/lib/forms/formsStore";

/** 작성·수정 화면에 필요한 것: 내 정보, 결재자 목록, 도장 */
export async function loadFormContext() {
  const [drafter, candidates, stampUrl] = await Promise.all([
    withRetry(() => getDrafterProfile(), "forms/drafter"),
    withRetry(() => listApproverCandidates(), "forms/approvers"),
    getStampUrl(),
  ]);
  return { drafter, candidates, stampUrl };
}

/** 도장이 없을 때 작성 화면 위에 띄우는 안내 */
export const NO_STAMP_MESSAGE = "등록된 도장이 없습니다. 양식 문서 첫 화면의 '내 도장'에서 등록하면 담당 칸에 자동으로 찍힙니다.";
