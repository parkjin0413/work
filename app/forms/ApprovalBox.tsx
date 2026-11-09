/** 결재란 한 칸: 위에 직급(역할), 아래 서명 칸. 도장이 있으면 서명 칸에 겹쳐 찍는다. */
export function ApprovalBox({ label, name, stampUrl }: { label: string; name: string; stampUrl?: string | null }) {
  return (
    <div className="flex w-20 flex-col text-center sm:w-24">
      <div className="border border-[#211D14] bg-[#F5F3EA] py-1 text-[10px] font-medium text-[#4B4739] sm:text-xs">
        {label || " "}
      </div>
      <div className="relative flex h-16 items-center justify-center border border-t-0 border-[#211D14] bg-white sm:h-20">
        {stampUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- 비공개 버킷 서명 URL이라 next/image 를 쓰지 않는다
          <img src={stampUrl} alt="도장" className="absolute h-12 w-12 object-contain opacity-90 sm:h-14 sm:w-14" />
        )}
        <span className="relative text-xs font-normal text-[#211D14]/15 sm:text-sm">{name || " "}</span>
      </div>
    </div>
  );
}

/** 결재란 왼쪽의 세로 글자 칸 ("결/재", "소속/결재") */
export function SideLabel({ lines, widthClass = "w-9 sm:w-10" }: { lines: string[]; widthClass?: string }) {
  return (
    <div
      className={`flex ${widthClass} flex-col items-center justify-center gap-1 border border-[#211D14] px-1 text-xs font-medium sm:text-sm`}
    >
      {lines.map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

/** 문서 맨 아래 회사 표시 */
export function PaperFooter() {
  return (
    <div className="flex items-center justify-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- 인쇄 안정성을 위해 일반 img 사용 */}
      <img src="/form-logo.png" alt="강산이엔지" className="h-7 w-7 shrink-0" />
      <span className="whitespace-nowrap text-sm font-bold tracking-tight">주식회사 강산이엔지</span>
    </div>
  );
}

/** 인쇄 양식 표 칸 */
export const PAPER_TH = "paper-cell border border-[#211D14] bg-[#F5F3EA] px-3 py-2 text-center font-medium";
export const PAPER_TD = "paper-cell border border-[#211D14] px-3 py-2 text-center";
export const PAPER_SHEET =
  "print-sheet mx-auto w-full max-w-3xl border border-[#E7E2D2] bg-white p-6 text-[#211D14] sm:p-10";
