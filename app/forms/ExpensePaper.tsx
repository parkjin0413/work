import { MAX_CONSULTATIONS, type ExpenseItem } from "@/lib/forms/types";
import { ApprovalBox, PAPER_SHEET, PAPER_TD as td, PAPER_TH as th, PaperFooter, SideLabel } from "./ApprovalBox";

export type PaperApprover = { order: number; name: string; jobTitle: string };

export type ExpensePaperProps = {
  docNumber?: string;
  drafterName: string;
  drafterPosition: string;
  department: string;
  draftedAt: string;
  title: string;
  content: string;
  items: ExpenseItem[];
  totalAmount: number;
  consultations: string[];
  instructions: string;
  approvers: PaperApprover[];
  attachmentTypes: string[];
  attachmentOther: string;
  stampUrl?: string | null;
};

// 협의처 구역 시작을 알리는 얇은 이중 구분선(왼쪽 테두리)
const divider = "border-l-4 [border-left-style:double]";

/** 품의서 인쇄 양식 (작성 화면 미리보기와 문서 화면에서 같이 쓴다) */
export function ExpensePaper({
  docNumber,
  drafterName,
  drafterPosition,
  department,
  draftedAt,
  title,
  content,
  items,
  totalAmount,
  consultations,
  instructions,
  approvers,
  attachmentTypes,
  attachmentOther,
  stampUrl,
}: ExpensePaperProps) {
  const consultationRows = Array.from({ length: MAX_CONSULTATIONS }, (_, i) => consultations[i] ?? "");

  return (
    <div className={PAPER_SHEET}>
      <div className="paper-block mb-6 flex items-center gap-3">
        <div className="flex flex-1 justify-center overflow-hidden">
          <h1 className="whitespace-nowrap text-3xl font-bold tracking-widest sm:text-4xl">품 의 서</h1>
        </div>
        <div className="flex shrink-0 items-stretch">
          <SideLabel lines={["결", "재"]} widthClass="w-6 sm:w-7" />
          <ApprovalBox label="담당" name={drafterName} stampUrl={stampUrl} />
          {approvers.map((a) => (
            <ApprovalBox key={a.order} label={a.jobTitle} name={a.name} />
          ))}
        </div>
      </div>

      {/* 문서정보 + 협의처/날인/협의·검토사항: 원본 양식처럼 한 표 안에 나란히 */}
      <table className="paper-block mb-6 w-full border-collapse text-xs sm:text-sm">
        <tbody>
          <tr>
            <th className={`w-20 sm:w-24 ${th}`}>문서번호</th>
            <td colSpan={3} className={td}>
              {docNumber ?? "-"}
            </td>
            <th className={`w-24 sm:w-28 ${th} ${divider}`}>협의처</th>
            <th className={`w-14 sm:w-16 ${th}`}>날인</th>
            <th className={th}>협의/검토사항</th>
          </tr>
          <tr>
            <th className={th}>기안일자</th>
            <td colSpan={3} className={td}>
              {draftedAt}
            </td>
            <td className={`${td} ${divider}`}>{consultationRows[0]}</td>
            <td className={td}>&nbsp;</td>
            <td className={td}>&nbsp;</td>
          </tr>
          <tr>
            <th className={th}>기안부서</th>
            <td className={td}>{department || "-"}</td>
            <th className={`w-14 sm:w-16 ${th}`}>직급</th>
            <td className={td}>{drafterPosition || "-"}</td>
            <td className={`${td} ${divider}`}>{consultationRows[1]}</td>
            <td className={td}>&nbsp;</td>
            <td className={td}>&nbsp;</td>
          </tr>
          <tr>
            <th className={th}>기 안 자</th>
            <td colSpan={3} className={td}>
              {drafterName}
            </td>
            <td className={`${td} ${divider}`}>{consultationRows[2]}</td>
            <td className={td}>&nbsp;</td>
            <td className={td}>&nbsp;</td>
          </tr>
          <tr>
            <th className={th}>제 목</th>
            <td colSpan={6} className={td}>
              {title || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="paper-block mb-6 min-h-[160px] border border-[#211D14] px-4 py-5">
        <p className="text-center text-xs sm:text-sm">아래와 같이 (보고, 지급)하고자 하오니 재가하여 주시기 바랍니다.</p>
        <p className="mt-3 text-center text-sm font-semibold tracking-widest sm:text-base">◈ 아 래 ◈</p>
        <div className="mt-4 whitespace-pre-wrap text-xs sm:text-sm">{content}</div>
      </div>

      <table className="paper-block mb-6 w-full border-collapse text-xs sm:text-sm">
        <thead>
          <tr>
            <th className={th}>품목</th>
            <th className={th}>거래처</th>
            <th className={th}>금액</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={3} className="border border-[#211D14] px-3 py-4 text-center text-[#8A8270]">
                지출 항목을 입력해주세요.
              </td>
            </tr>
          ) : (
            items.map((item, i) => (
              <tr key={i}>
                <td className={td}>{item.description}</td>
                <td className={td}>{item.vendor || "-"}</td>
                <td className={td}>{item.amount.toLocaleString("ko-KR")}</td>
              </tr>
            ))
          )}
          <tr className="bg-[#F5F3EA] font-bold">
            <td colSpan={2} className={td}>
              합계
            </td>
            <td className={td}>{totalAmount.toLocaleString("ko-KR")}원</td>
          </tr>
        </tbody>
      </table>

      <div className="paper-block mb-6">
        <div className="mb-1 text-xs font-medium text-[#4B4739] sm:text-sm">지시사항</div>
        <p className="min-h-[60px] whitespace-pre-wrap rounded-lg border border-[#E7E2D2] p-3 text-xs sm:text-sm">
          {instructions || " "}
        </p>
      </div>

      {(attachmentTypes.length > 0 || attachmentOther) && (
        <div className="paper-block mb-6">
          <div className="mb-1 text-xs font-medium text-[#4B4739] sm:text-sm">증빙 첨부 (인쇄 후 뒷면에 별도 첨부)</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-lg border border-[#E7E2D2] p-3 text-xs sm:text-sm">
            {attachmentTypes.map((type) => (
              <span key={type} className="whitespace-nowrap">
                ☑ {type}
              </span>
            ))}
            {attachmentOther && <span className="whitespace-nowrap">☑ {attachmentOther}</span>}
          </div>
        </div>
      )}

      <PaperFooter />
    </div>
  );
}
