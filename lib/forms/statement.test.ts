import { describe, it, expect } from "vitest";
import {
  buildSuggestions,
  carAmount,
  formatRowDate,
  koreanAmountPhrase,
  parseStatementFields,
  previousMonthStart,
  sumRows,
  toKoreanAmount,
} from "./statement";

describe("carAmount (거리 ÷ 10 × 단가 × 110%, 반올림)", () => {
  it("10월 경비내역서 숫자와 같다", () => {
    expect(carAmount(73, 1869)).toBe(15008);
    expect(carAmount(32, 1869)).toBe(6579);
    expect(carAmount(69, 1869)).toBe(14186);
  });

  it("거리나 단가가 없으면 0", () => {
    expect(carAmount(0, 1869)).toBe(0);
    expect(carAmount(30, 0)).toBe(0);
  });

  it("소수 거리도 계산한다", () => {
    expect(carAmount(12.5, 1800)).toBe(2475); // 1.25 × 1800 × 1.1
  });
});

describe("toKoreanAmount", () => {
  it("결재 서류 표기로 바꾼다", () => {
    expect(toKoreanAmount(106852)).toBe("일십만육천팔백오십이");
    expect(koreanAmountPhrase(106852)).toBe("일금일십만육천팔백오십이원整");
    expect(toKoreanAmount(1000000)).toBe("일백만");
    expect(toKoreanAmount(20030)).toBe("이만삼십");
    expect(toKoreanAmount(150000000)).toBe("일억오천만");
    expect(toKoreanAmount(0)).toBe("영");
  });
});

describe("formatRowDate", () => {
  it("월은 그대로, 일은 두 자리", () => {
    expect(formatRowDate("2026-10-02")).toBe("10월 02일");
  });
});

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [k, v] of entries) data.append(k, v);
  return data;
}

function row(kind: string, date: string, description: string, amount: string, distance: string, note = "") {
  return [
    ["row_kind", kind],
    ["row_date", date],
    ["row_description", description],
    ["row_amount", amount],
    ["row_distance", distance],
    ["row_note", note],
  ] as [string, string][];
}

describe("parseStatementFields", () => {
  it("10월 경비내역서 9줄을 그대로 다시 만들면 합계 106,852원", () => {
    const result = parseStatementFields(
      form([
        ["written_at", "2026-11-02"],
        ["fuel_price", "1,869"],
        ...row("car", "2026-10-02", "직출(윤애드) → 양주 사무실(회암동)", "", "73"),
        ...row("car", "2026-10-07", "양주 사무실(회암동) → 서울 사무실(창동)", "", "32"),
        ...row("general", "2026-10-08", "삼육오감자탕 - 점심 식사 2명 (박진, 손우림)", "24,000", ""),
        ...row("general", "2026-10-21", "삼육오감자탕 - 점심 식사 2명 (박진, 손우림)", "24000", ""),
        ...row("car", "2026-10-26", "양주 사무실(회암동) → 서울 사무실(창동)", "", "32"),
        ...row("car", "2026-10-27", "코엑스 → 직퇴", "", "69"),
        ...row("general", "2026-10-27", "코엑스 주차비 (전시회 설치)", "12000", ""),
        ...row("general", "2026-10-27", "하이패스 (회암동 → 코엑스)", "3100", ""),
        ...row("general", "2026-10-27", "하이패스 (코엑스 → 직퇴)", "1400", ""),
        ...row("general", "", "", "", ""),
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rows).toHaveLength(9);
    expect(result.value.totalAmount).toBe(106852);
    expect(result.value.rows[0]).toMatchObject({ kind: "car", amount: 15008, distance: 73, note: "110%" });
    expect(sumRows(result.value.rows)).toBe(106852);
  });

  it("날짜순으로 정렬한다 (같은 날은 적은 순서)", () => {
    const result = parseStatementFields(
      form([
        ["written_at", "2026-11-02"],
        ["fuel_price", ""],
        ...row("general", "2026-10-27", "B", "100", ""),
        ...row("general", "2026-10-02", "A", "100", ""),
        ...row("general", "2026-10-27", "C", "100", ""),
      ]),
    );
    expect(result.ok && result.value.rows.map((r) => r.description)).toEqual(["A", "B", "C"]);
  });

  it("자차 줄이 있는데 단가가 없으면 막는다", () => {
    const result = parseStatementFields(
      form([["written_at", "2026-11-02"], ["fuel_price", ""], ...row("car", "2026-10-02", "외근", "", "10")]),
    );
    expect(result).toEqual({ ok: false, error: "자차 줄이 있으면 주유 단가를 입력해주세요." });
  });

  it("빈 칸이 있는 줄은 몇 번째 줄인지 알려준다", () => {
    const noAmount = parseStatementFields(
      form([["written_at", "2026-11-02"], ["fuel_price", ""], ...row("general", "2026-10-02", "식대", "", "")]),
    );
    expect(noAmount).toEqual({ ok: false, error: "1번 줄의 금액을 확인해주세요." });

    const noDistance = parseStatementFields(
      form([["written_at", "2026-11-02"], ["fuel_price", "1800"], ...row("car", "2026-10-02", "외근", "", "")]),
    );
    expect(noDistance).toEqual({ ok: false, error: "1번 줄의 거리(km)를 입력해주세요." });
  });
});

describe("buildSuggestions", () => {
  const car = (date: string, description: string, distance: number) =>
    ({ kind: "car", date, description, distance, amount: 0, note: "110%" }) as const;
  const gen = (date: string, description: string, amount: number) =>
    ({ kind: "general", date, description, distance: null, amount, note: "" }) as const;

  it("같은 내용은 묶고, 자주 쓴 순으로, 값은 가장 최근 것", () => {
    const suggestions = buildSuggestions([
      { rows: [car("2026-11-03", "회암동 → 창동", 33), gen("2026-11-05", "점심 식사", 26000)] },
      {
        rows: [
          car("2026-10-07", "회암동 → 창동", 32),
          car("2026-10-26", "회암동 → 창동", 32),
          gen("2026-10-08", "점심 식사", 24000),
        ],
      },
    ]);
    expect(suggestions[0]).toMatchObject({ description: "회암동 → 창동", kind: "car", distance: 33, count: 3 });
    expect(suggestions[1]).toMatchObject({ description: "점심 식사", kind: "general", amount: 26000, count: 2 });
  });
});

describe("previousMonthStart", () => {
  it("작성일의 지난달 1일", () => {
    expect(previousMonthStart("2026-11-02")).toBe("2026-10-01");
    expect(previousMonthStart("2027-01-05")).toBe("2026-12-01");
  });
});

describe("parseStatementFields 빈 줄", () => {
  it("날짜만 있고 내용·금액이 없는 줄은 건너뛴다", () => {
    const data = new FormData();
    for (const [k, v] of [
      ["written_at", "2026-11-02"],
      ["fuel_price", ""],
      ["row_kind", "general"],
      ["row_date", "2026-10-08"],
      ["row_description", "점심 식사"],
      ["row_amount", "24000"],
      ["row_distance", ""],
      ["row_note", ""],
      ["row_kind", "general"],
      ["row_date", "2026-10-01"],
      ["row_description", ""],
      ["row_amount", ""],
      ["row_distance", ""],
      ["row_note", ""],
    ])
      data.append(k, v);
    const result = parseStatementFields(data);
    expect(result.ok && result.value.rows).toHaveLength(1);
  });
});
