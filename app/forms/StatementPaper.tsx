import {
  formatRowDate,
  formatWrittenAt,
  koreanAmountPhrase,
  STATEMENT_MAX_ROWS,
  type StatementRow,
} from "@/lib/forms/statement";
import { PAPER_SHEET, PaperScroll } from "./ApprovalBox";

export type StatementPaperProps = {
  drafterName: string;
  drafterPosition: string;
  writtenAt: string;
  fuelPrice: number | null;
  rows: StatementRow[];
  totalAmount: number;
  stampUrl?: string | null;
};

const won = (n: number) => n.toLocaleString("ko-KR");

/*
 * 회사 경비내역서(엑셀)를 실제로 인쇄한 A4 를 mm 로 재서 옮긴 값.
 * 모든 크기를 글자 크기(em) 기준으로 적어, 인쇄(글자 3.35mm)와 화면 미리보기의 비율이 같다.
 *   본문 폭 182.7mm, 위 여백 약 21.5mm(결재칸 윗선까지)
 * 높이(em)는 그 줄 글자 크기 기준이라, 글자를 키운 줄(×1.15)은 그만큼 나눈 값이다.
 *   결재칸 88×22mm (머리 6mm + 서명 16mm, 세로 글자 칸 10.5mm, 칸마다 19.4mm)
 *   작성일 줄 6.1mm · 경비금액 줄 7.2mm · "내 역" 8.4mm · 머리 줄 7.7mm · 내역 줄 7.57mm ×18 · 합계 6.1mm · 안내 5mm
 */
const DETAIL_COLS = ["6.4%", "13.8%", "15.1%", "7.9%", "5.7%", "39.3%", "11.8%"]; // No·날짜·금액·단가·거리·내용·비고
const INFO_COLS = ["12.5%", "30.7%", "8.8%", "48%"]; // 라벨 · 값 · 작성자 라벨 · 값 (경비금액 줄은 가운데 두 칸이 한 칸)

const cell = "border border-black px-[0.45em]";
// 바깥 굵은 테두리는 감싸는 상자가 그리므로 표의 가장자리 칸 선은 지운다
const edgeless = "[&_tr>*:first-child]:border-l-0 [&_tr>*:last-child]:border-r-0 [&_tr:first-child>*]:border-t-0";

/** 경비내역서 인쇄 양식 — 결재 받는 서류라 회사 양식(엑셀)을 인쇄한 모양 그대로 따른다 */
export function StatementPaper({
  drafterName,
  drafterPosition,
  writtenAt,
  fuelPrice,
  rows,
  totalAmount,
  stampUrl,
}: StatementPaperProps) {
  const lines = Array.from({ length: STATEMENT_MAX_ROWS }, (_, i) => rows[i] ?? null);

  return (
    <PaperScroll>
      <div className={`${PAPER_SHEET} text-black`}>
        {/* 인쇄: 글자 3.35mm(약 9.5pt), 위 6.5mm·좌우 1.65mm 안쪽 여백으로 엑셀 인쇄본과 같은 자리에 오게 */}
        <div className="text-[0.8rem] font-normal leading-tight print:px-[1.65mm] print:pt-[6.5mm] print:text-[3.35mm]">
          {/* 제목 + 결재란 */}
          <div className="flex items-stretch">
            <div className="flex flex-1 items-center justify-center pt-[0.6em]">
              <h1 className="text-[2.15em] font-normal tracking-[0.45em]">경비내역서</h1>
            </div>
            <table className="mr-[0.7em] border-collapse border-[1.5px] border-black text-center">
              <colgroup>
                <col style={{ width: "3.13em" }} />
                <col style={{ width: "5.8em" }} />
                <col style={{ width: "5.8em" }} />
                <col style={{ width: "5.8em" }} />
                <col style={{ width: "5.8em" }} />
              </colgroup>
              <tbody>
                <tr style={{ height: "1.56em" }} className="text-[1.15em]">
                  <td rowSpan={2} className={`${cell} text-[1.05em] leading-[2.4]`}>
                    결
                    <br />재
                  </td>
                  <td className={cell}>담 당</td>
                  <td className={cell}>부장</td>
                  <td className={cell}>임원</td>
                  <td className={`${cell} px-0`}>대표이사</td>
                </tr>
                <tr style={{ height: "4.8em" }} className="text-[1em]">
                  <td className={`${cell} relative`}>
                    {stampUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 비공개 버킷 서명 URL
                      <img
                        src={stampUrl}
                        alt="도장"
                        className="absolute left-1/2 top-1/2 h-[3.9em] w-[3.9em] -translate-x-1/2 -translate-y-1/2 object-contain"
                      />
                    ) : null}
                  </td>
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                </tr>
              </tbody>
            </table>
          </div>

          {/* 본문: 바깥 테두리 안에 표 두 개(작성일·경비금액 / 내역) */}
          <div className="mt-[0.52em] border-[1.5px] border-black">
            <table className={`w-full table-fixed border-collapse text-[1.15em] ${edgeless}`}>
              <colgroup>
                {INFO_COLS.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <tbody>
                <tr style={{ height: "1.58em" }}>
                  <td className={`${cell} text-center`}>작성일</td>
                  <td className={`${cell} text-left`}>{writtenAt ? formatWrittenAt(writtenAt) : ""}</td>
                  <td className={`${cell} text-center`}>작성자</td>
                  <td className={`${cell} text-center`}>{[drafterName, drafterPosition].filter(Boolean).join(" ")}</td>
                </tr>
                <tr style={{ height: "1.87em" }}>
                  <td className={`${cell} text-center`}>경비금액</td>
                  {/* 엑셀 원본처럼 一金 과 한글 금액은 한 칸 (작성자 라벨 칸 아래까지) */}
                  <td colSpan={2} className={`${cell} whitespace-nowrap`}>
                    <span className="pl-[0.6em]">一金</span>
                    <span className="pl-[1.6em] tracking-tight">
                      {rows.length > 0 ? koreanAmountPhrase(totalAmount) : ""}
                    </span>
                  </td>
                  <td className={cell}>
                    <div className="flex items-center justify-between">
                      <span>₩</span>
                      <span>{rows.length > 0 ? won(totalAmount) : ""}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className={`w-full table-fixed border-collapse ${edgeless} [&_tr:last-child>*]:border-b-0`}>
              <colgroup>
                {DETAIL_COLS.map((w, i) => (
                  <col key={i} style={{ width: w }} />
                ))}
              </colgroup>
              <tbody>
                <tr style={{ height: "2.18em" }} className="bg-[#D9D9D9] text-[1.15em]">
                  <td colSpan={7} className={`${cell} text-center tracking-[2.2em]`}>
                    내역
                  </td>
                </tr>
                <tr style={{ height: "2.3em" }} className="bg-[#D9D9D9] text-center">
                  <td className={`${cell} text-[1.15em]`}>No.</td>
                  <td className={`${cell} text-[1.15em] tracking-[1em]`}>날짜</td>
                  <td className={`${cell} text-[1.15em] tracking-[1.2em]`}>금액</td>
                  <td className={`${cell} px-0`}>단가(원)</td>
                  <td className={`${cell} px-0 leading-[1.05]`}>
                    거리/
                    <br />
                    수량
                  </td>
                  <td className={cell}>내용</td>
                  <td className={`${cell} tracking-[1.2em]`}>비고</td>
                </tr>
                {lines.map((row, i) => (
                  <tr key={i} style={{ height: "2.26em" }}>
                    <td className={`${cell} text-right`}>{row ? i + 1 : ""}</td>
                    <td className={`${cell} text-center`}>{row ? formatRowDate(row.date) : ""}</td>
                    <td className={`${cell} text-right`}>{row ? won(row.amount) : ""}</td>
                    <td className={`${cell} text-right`}>{row?.kind === "car" && fuelPrice ? won(fuelPrice) : ""}</td>
                    <td className={`${cell} px-0 text-center`}>
                      {row?.kind === "car" && row.distance != null ? row.distance : ""}
                    </td>
                    <td className={`${cell} break-keep text-center leading-tight`}>{row?.description ?? ""}</td>
                    <td className={`${cell} text-center`}>{row?.note ?? ""}</td>
                  </tr>
                ))}
                <tr style={{ height: "1.82em" }}>
                  <td colSpan={2} className={`${cell} text-center tracking-[1.6em]`}>
                    합계
                  </td>
                  <td className={`${cell} text-right`}>{rows.length > 0 ? won(totalAmount) : ""}</td>
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                  <td className={cell} />
                </tr>
                <tr style={{ height: "1.5em" }}>
                  <td colSpan={7} className={`${cell} text-left`}>
                    ※ 증빙서의 수취는 사업자 지출증빙영수증으로 첨부하는것을 원칙으로 한다.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="mt-[0.6em] text-center text-[1.1em]">주식회사 강산이엔지</p>
        </div>
      </div>
    </PaperScroll>
  );
}
