export const dynamic = "force-dynamic";

import Link from "next/link";
import { withRetry } from "@/lib/supabase/withRetry";
import { getStampUrl, listExpenseReports, listLeaveRequests } from "@/lib/forms/formsStore";
import { StampCard } from "./StampCard";

const NEW_BUTTON_CLASS =
  "shrink-0 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover";
const TH_CLASS = "px-4 py-2.5 font-medium";
const TD_CLASS = "px-4 py-2.5";

/** "2026-11-09" → "2026.11.09" */
const dot = (iso: string) => iso.replace(/-/g, ".");

export default async function FormsPage() {
  let expenses;
  let leaves;
  try {
    [expenses, leaves] = await Promise.all([
      withRetry(() => listExpenseReports(), "forms/expense"),
      withRetry(() => listLeaveRequests(), "forms/leave"),
    ]);
  } catch (error) {
    console.error("[forms] 목록 조회 실패:", error);
    return (
      <>
        <h1 className="text-lg font-semibold text-foreground">양식</h1>
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">
            문서 목록을 불러오지 못했습니다. Supabase 연결 상태와 0022_forms.sql 마이그레이션 실행 여부를 확인해주세요.
          </p>
        </div>
      </>
    );
  }
  const stampUrl = await getStampUrl();

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground">양식</h1>
      <p className="mt-1 text-sm text-muted">사내 서류를 정해진 양식에 맞춰 작성하고 인쇄합니다.</p>

      <div className="mt-5 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section aria-label="품의서" className="rounded-2xl border border-border bg-surface">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">품의서</h2>
              <p className="break-keep text-xs text-muted">
                지출 내역과 안건을 정리해 결재를 받는 문서 · {expenses.length}건
              </p>
            </div>
            <Link href="/forms/expense/new" className={NEW_BUTTON_CLASS}>
              + 새 품의서
            </Link>
          </div>
          {expenses.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">작성한 품의서가 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm sm:min-w-[36rem]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className={`${TH_CLASS} hidden sm:table-cell`}>문서번호</th>
                    <th className={TH_CLASS}>제목</th>
                    <th className={`${TH_CLASS} hidden sm:table-cell`}>기안일</th>
                    <th className={`${TH_CLASS} text-right`}>금액</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((report) => (
                    <tr key={report.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className={`${TD_CLASS} hidden whitespace-nowrap sm:table-cell`}>
                        <Link href={`/forms/expense/${report.id}`} className="font-medium text-accent hover:underline">
                          {report.docNumber}
                        </Link>
                      </td>
                      <td className={TD_CLASS}>
                        <Link
                          href={`/forms/expense/${report.id}`}
                          className="break-keep text-foreground hover:underline"
                        >
                          {report.title}
                        </Link>
                        {/* 휴대폰에서는 문서번호·기안일 칸을 숨기고 제목 아래에 작게 */}
                        <p className="mt-0.5 text-xs text-muted sm:hidden">
                          {report.docNumber} · {dot(report.draftedAt)}
                        </p>
                      </td>
                      <td className={`${TD_CLASS} hidden whitespace-nowrap text-muted sm:table-cell`}>
                        {dot(report.draftedAt)}
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap text-right text-foreground`}>
                        {report.totalAmount.toLocaleString("ko-KR")}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex flex-col gap-6">
          <section aria-label="휴가신청서" className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">휴가신청서</h2>
                <p className="break-keep text-xs text-muted">
                  휴가기간과 사유를 정리해 결재를 받는 문서 · {leaves.length}건
                </p>
              </div>
              <Link href="/forms/leave/new" className={NEW_BUTTON_CLASS}>
                + 새 휴가신청서
              </Link>
            </div>
            {leaves.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">작성한 휴가신청서가 없습니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted">
                      <th className={TH_CLASS}>휴가기간</th>
                      <th className={TH_CLASS}>종류</th>
                      <th className={`${TH_CLASS} text-right`}>일수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                        <td className={`${TD_CLASS} whitespace-nowrap`}>
                          <Link href={`/forms/leave/${leave.id}`} className="font-medium text-accent hover:underline">
                            {leave.startDate === leave.endDate
                              ? dot(leave.startDate)
                              : `${dot(leave.startDate)} ~ ${dot(leave.endDate).slice(5)}`}
                          </Link>
                        </td>
                        <td className={`${TD_CLASS} text-foreground`}>{leave.leaveType}</td>
                        <td className={`${TD_CLASS} text-right text-foreground`}>{leave.days}일</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <StampCard stampUrl={stampUrl} />
        </div>
      </div>
    </>
  );
}
