import type { LeaveBalance } from "@/lib/forms/types";
import { ApprovalBox, PAPER_SHEET, PAPER_TD as td, PAPER_TH as th, PaperFooter, SideLabel } from "./ApprovalBox";
import type { PaperApprover } from "./ExpensePaper";

export type LeavePaperProps = {
  docNumber?: string;
  drafterName: string;
  drafterPosition: string;
  department: string;
  draftedAt: string;
  startDate: string;
  endDate: string;
  days: number | string;
  leaveType: string;
  reason: string;
  substituteJobTitle: string;
  substituteName: string;
  leaveBalance: LeaveBalance;
  approvers: PaperApprover[];
  stampUrl?: string | null;
};

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "2026년 11월 9일(월)" */
export function formatKoreanDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value || "-";
  const weekday = WEEKDAY_KO[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y}년 ${m}월 ${d}일(${weekday})`;
}

const BALANCE_ROWS = [
  { key: "annual", label: "연차" },
  { key: "substitute", label: "대체휴가" },
] as const;

/** 휴가신청서 인쇄 양식 */
export function LeavePaper({
  docNumber,
  drafterName,
  drafterPosition,
  department,
  draftedAt,
  startDate,
  endDate,
  days,
  leaveType,
  reason,
  substituteJobTitle,
  substituteName,
  leaveBalance,
  approvers,
  stampUrl,
}: LeavePaperProps) {
  return (
    <div className={PAPER_SHEET}>
      <div className="mb-6 flex items-center gap-3">
        <div className="flex flex-1 justify-center overflow-hidden">
          <h1 className="whitespace-nowrap text-xl font-bold tracking-widest sm:text-2xl">■휴가 □교육 신청서</h1>
        </div>
        {/* 위 결재란은 받는 쪽(관리부)에서 쓰는 칸이라 비워 둔다 */}
        <div className="flex shrink-0 items-stretch">
          <SideLabel lines={["결", "재"]} />
          <ApprovalBox label="담당" name="" />
          <ApprovalBox label="부장" name="" />
          <ApprovalBox label="부서장" name="" />
          <ApprovalBox label="대표이사" name="" />
        </div>
      </div>

      {docNumber && <p className="mb-2 text-sm text-[#8A8270]">문서번호 {docNumber}</p>}

      <table className="mb-6 w-full border-collapse text-xs sm:text-sm">
        <tbody>
          <tr>
            <th className={th}>소속부서</th>
            <td className={td}>{department || "-"}</td>
            <th className={th}>직 위</th>
            <td className={td}>{drafterPosition || "-"}</td>
            <th className={th}>성 명</th>
            <td className={td}>{drafterName} (인)</td>
          </tr>
          <tr>
            <th className={th}>일 시</th>
            <td colSpan={3} className={td}>
              <div>{formatKoreanDate(startDate)} 부터</div>
              <div>{formatKoreanDate(endDate)} 까지</div>
            </td>
            <th className={th}>기 간</th>
            <td className={td}>{days ? `${days}일` : "-"}</td>
          </tr>
          <tr>
            <th className={th}>사 유</th>
            <td colSpan={5} className={`whitespace-pre-wrap ${td}`}>
              {reason || "-"}
            </td>
          </tr>
          <tr>
            <th className={th}>업무 대행자</th>
            <td colSpan={5} className={td}>
              직위 : {substituteJobTitle || "x"} &nbsp;&nbsp; 성명 : {substituteName || "x"}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="mb-6 w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr>
            <th className={th}>구 분</th>
            <th className={th}>전체일수</th>
            <th className={th}>전일까지 누계</th>
            <th className={th}>사용일</th>
            <th className={th}>잔여일</th>
          </tr>
        </thead>
        <tbody>
          {BALANCE_ROWS.map(({ key, label }) => (
            <tr key={key}>
              <th className={th}>{label}</th>
              <td className={td}>{leaveBalance[key].total || " "}</td>
              <td className={td}>{leaveBalance[key].priorUsed || " "}</td>
              <td className={td}>{leaveBalance[key].used || " "}</td>
              <td className={td}>{leaveBalance[key].remaining || " "}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="my-16 text-center text-xs sm:my-24 sm:text-sm">
        위와 같이 휴가({leaveType || "-"})를 신청하오니 결재하여 주시기 바랍니다.
      </p>
      <p className="mb-10 text-center text-xs sm:mb-14 sm:text-sm">{formatKoreanDate(draftedAt)}</p>

      <div className="mb-4 flex items-stretch">
        <SideLabel lines={["소속", "결재"]} />
        <ApprovalBox label="담당" name={drafterName} stampUrl={stampUrl} />
        {approvers.map((a) => (
          <ApprovalBox key={a.order} label={a.jobTitle} name={a.name} />
        ))}
      </div>

      <p className="mb-6 text-right text-xs text-[#6B6455] sm:text-sm">* 휴가 3일전 제출해주시기 바랍니다.</p>

      <PaperFooter />
    </div>
  );
}
