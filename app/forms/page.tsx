export const dynamic = "force-dynamic";

import Link from "next/link";
import { withRetry } from "@/lib/supabase/withRetry";
import { getStampUrl, listExpenseReports, listExpenseStatements, listLeaveRequests } from "@/lib/forms/formsStore";
import type { ExpenseStatementSummary } from "@/lib/forms/statement";
import { inPeriod, isFiltered, matchesQuery, monthlyTotals, parseFormsFilter } from "@/lib/forms/listFilter";
import { getKstTodayISO } from "@/lib/tasks/week";
import { StampCard } from "./StampCard";

const NEW_BUTTON_CLASS =
  "shrink-0 whitespace-nowrap rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent-hover";
const TH_CLASS = "px-4 py-2.5 font-medium";
const TD_CLASS = "px-4 py-2.5";

/** "2026-11-09" → "2026.11.09" */
const dot = (iso: string) => iso.replace(/-/g, ".");

const won = (value: number) => `${value.toLocaleString("ko-KR")}원`;

export default async function FormsPage({
  searchParams,
}: {
  searchParams: { q?: string; year?: string; month?: string };
}) {
  const filter = parseFormsFilter(searchParams);
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
  // 경비내역서는 표(0023)를 나중에 만들었으므로, 아직 없어도 나머지 목록은 보여준다.
  let statements: ExpenseStatementSummary[] | null = null;
  try {
    statements = await withRetry(() => listExpenseStatements(), "forms/statement");
  } catch (error) {
    console.error("[forms] 경비내역서 목록 조회 실패:", error);
  }

  // 월별 합계는 검색어와 상관없이 고른 연도(없으면 최근 6개월) 기준
  const monthly = monthlyTotals(expenses, statements ?? [], { year: filter.year });
  const years = Array.from(
    new Set([
      Number(getKstTodayISO().slice(0, 4)),
      ...expenses.map((e) => Number(e.draftedAt.slice(0, 4))),
      ...(statements ?? []).map((s) => Number(s.writtenAt.slice(0, 4))),
      ...leaves.map((l) => Number(l.startDate.slice(0, 4))),
    ]),
  ).sort((a, b) => b - a);

  const filtered = isFiltered(filter);
  const totalCounts = { expenses: expenses.length, statements: statements?.length ?? 0, leaves: leaves.length };
  expenses = expenses.filter((e) => inPeriod(e.draftedAt, filter) && matchesQuery(filter, e.title, e.docNumber));
  // 경비내역서 목록에는 내용이 없어 검색어로는 거르지 않고 기간만 본다 (내역 기간 첫날, 없으면 작성일)
  statements = statements?.filter((s) => inPeriod(s.firstDate ?? s.writtenAt, filter)) ?? null;
  leaves = leaves.filter((l) => inPeriod(l.startDate, filter) && matchesQuery(filter, l.leaveType, l.docNumber));
  const countLabel = (shown: number, total: number) => (filtered ? `${shown}/${total}건` : `${total}건`);

  const selectClass = "rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-foreground";

  return (
    <>
      <h1 className="text-lg font-semibold text-foreground">양식</h1>
      <p className="mt-1 text-sm text-muted">사내 서류를 정해진 양식에 맞춰 작성하고 인쇄합니다.</p>

      {/* 검색·기간: 주소(?q=&year=&month=)로 걸러서 새로고침·뒤로가기에도 그대로 */}
      <form method="get" role="search" className="mt-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={filter.q}
          placeholder="품의서 제목·문서번호, 휴가 종류"
          aria-label="문서 검색"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-foreground placeholder:text-muted sm:max-w-xs"
        />
        <select name="year" defaultValue={filter.year ?? ""} aria-label="연도" className={selectClass}>
          <option value="">전체 연도</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}년
            </option>
          ))}
        </select>
        <select name="month" defaultValue={filter.month ?? ""} aria-label="월" className={selectClass}>
          <option value="">전체 월</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>
              {m}월
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover"
        >
          찾기
        </button>
        {filtered ? (
          <Link href="/forms" className="text-sm text-muted hover:text-foreground">
            초기화
          </Link>
        ) : null}
      </form>

      <div className="mt-5 grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <section aria-label="품의서" className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">품의서</h2>
                <p className="break-keep text-xs text-muted">
                  지출 내역과 안건을 정리해 결재를 받는 문서 · {countLabel(expenses.length, totalCounts.expenses)}
                </p>
              </div>
              <Link href="/forms/expense/new" className={NEW_BUTTON_CLASS}>
                + 새 품의서
              </Link>
            </div>
            {expenses.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">
                {filtered ? "조건에 맞는 품의서가 없습니다." : "작성한 품의서가 없습니다."}
              </p>
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
                          <Link
                            href={`/forms/expense/${report.id}`}
                            className="font-medium text-accent hover:underline"
                          >
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

          <section aria-label="경비내역서" className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">경비내역서</h2>
                <p className="break-keep text-xs text-muted">
                  식대·주차비·자차(110%) 등 경비를 정리해 결재를 받는 문서
                  {statements ? ` · ${countLabel(statements.length, totalCounts.statements)}` : ""}
                </p>
              </div>
              <Link href="/forms/statement/new" className={NEW_BUTTON_CLASS}>
                + 새 경비내역서
              </Link>
            </div>
            {statements === null ? (
              <p className="p-6 text-center text-sm text-muted">
                경비내역서 목록을 불러오지 못했습니다. 0023_expense_statements.sql 실행 여부를 확인해주세요.
              </p>
            ) : statements.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">
                {filtered ? "조건에 맞는 경비내역서가 없습니다." : "작성한 경비내역서가 없습니다."}
              </p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className={TH_CLASS}>내역 기간</th>
                    <th className={`${TH_CLASS} hidden sm:table-cell`}>작성일</th>
                    <th className={`${TH_CLASS} text-right`}>합계</th>
                  </tr>
                </thead>
                <tbody>
                  {statements.map((statement) => (
                    <tr key={statement.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className={TD_CLASS}>
                        <Link
                          href={`/forms/statement/${statement.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {statement.firstDate && statement.lastDate
                            ? statement.firstDate === statement.lastDate
                              ? dot(statement.firstDate)
                              : `${dot(statement.firstDate)} ~ ${dot(statement.lastDate).slice(5)}`
                            : "-"}
                        </Link>
                        <p className="text-xs text-muted">
                          {statement.rowCount}건<span className="sm:hidden"> · {dot(statement.writtenAt)} 작성</span>
                        </p>
                      </td>
                      <td className={`${TD_CLASS} hidden whitespace-nowrap text-muted sm:table-cell`}>
                        {dot(statement.writtenAt)}
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap text-right text-foreground`}>
                        {statement.totalAmount.toLocaleString("ko-KR")}원
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          <section aria-label="휴가신청서" className="rounded-2xl border border-border bg-surface">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">휴가신청서</h2>
                <p className="break-keep text-xs text-muted">
                  휴가기간과 사유를 정리해 결재를 받는 문서 · {countLabel(leaves.length, totalCounts.leaves)}
                </p>
              </div>
              <Link href="/forms/leave/new" className={NEW_BUTTON_CLASS}>
                + 새 휴가신청서
              </Link>
            </div>
            {leaves.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">
                {filtered ? "조건에 맞는 휴가신청서가 없습니다." : "작성한 휴가신청서가 없습니다."}
              </p>
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

          <section aria-label="월별 합계" className="rounded-2xl border border-border bg-surface">
            <div className="border-b border-border px-4 py-3">
              <h2 className="text-base font-semibold text-foreground">월별 합계</h2>
              <p className="break-keep text-xs text-muted">
                {filter.year ? `${filter.year}년` : "최근 6개월"} · 품의서는 기안일, 경비내역서는 내역 기간 기준
              </p>
            </div>
            {monthly.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted">합계를 낼 문서가 없습니다.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted">
                    <th className={TH_CLASS}>월</th>
                    <th className={`${TH_CLASS} text-right`}>품의서</th>
                    <th className={`${TH_CLASS} text-right`}>경비내역서</th>
                  </tr>
                </thead>
                <tbody>
                  {monthly.map((row) => (
                    <tr key={row.ym} className="border-b border-border last:border-0">
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <Link
                          href={`/forms?year=${row.ym.slice(0, 4)}&month=${Number(row.ym.slice(5, 7))}`}
                          className="font-medium text-foreground hover:text-accent hover:underline"
                        >
                          {row.ym.slice(0, 4)}.{row.ym.slice(5, 7)}
                        </Link>
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap text-right text-foreground`}>
                        {row.expenseCount ? won(row.expense) : "-"}
                        {row.expenseCount > 1 ? (
                          <span className="block text-xs text-muted">{row.expenseCount}건</span>
                        ) : null}
                      </td>
                      <td className={`${TD_CLASS} whitespace-nowrap text-right text-foreground`}>
                        {row.statementCount ? won(row.statement) : "-"}
                        {row.statementCount > 1 ? (
                          <span className="block text-xs text-muted">{row.statementCount}건</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <StampCard stampUrl={stampUrl} />
        </div>
      </div>
    </>
  );
}
