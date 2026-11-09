import { describe, it, expect } from "vitest";
import { parseExpenseFields, parseLeaveFields, readApproverIds } from "./parse";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

const expenseBase: [string, string][] = [
  ["drafted_at", "2026-11-09"],
  ["title", "홈페이지 호스팅 구입"],
  ["content", "1. 배경\n2. 기대 효과"],
  ["item_description", "호스팅 1년"],
  ["item_vendor", "카페24"],
  ["item_amount", "1,200,000"],
  ["item_description", ""],
  ["item_vendor", ""],
  ["item_amount", ""],
];

describe("parseExpenseFields", () => {
  it("빈 줄은 빼고 금액 쉼표를 없애 합계를 낸다", () => {
    const result = parseExpenseFields(
      form([
        ...expenseBase,
        ["consultation_department", " 관리부 "],
        ["consultation_department", ""],
        ["attachment_types", "영수증"],
        ["attachment_types", "견적서"],
        ["attachment_types", "아무거나"],
      ])
    );
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        items: [{ description: "호스팅 1년", vendor: "카페24", amount: 1200000 }],
        totalAmount: 1200000,
        consultations: ["관리부"],
        // 정해진 목록 순서대로, 목록에 없는 값은 버린다
        attachmentTypes: ["견적서", "영수증"],
      }),
    });
  });

  it("0원 항목은 남기고, 금액이 비었거나 품목이 없는 줄은 몇 번째인지 알려준다", () => {
    const head = expenseBase.slice(0, 3);
    const zero = parseExpenseFields(
      form([...head, ["item_description", "무상 샘플"], ["item_vendor", ""], ["item_amount", "0"]])
    );
    expect(zero).toEqual({
      ok: true,
      value: expect.objectContaining({ items: [{ description: "무상 샘플", vendor: "", amount: 0 }], totalAmount: 0 }),
    });

    const missingAmount = parseExpenseFields(
      form([
        ...expenseBase.slice(0, 6),
        ["item_description", "배송비"],
        ["item_vendor", "카페24"],
        ["item_amount", ""],
      ])
    );
    expect(missingAmount).toEqual({ ok: false, error: "2번 지출 항목의 금액을 확인해주세요." });

    const missingName = parseExpenseFields(
      form([...head, ["item_description", ""], ["item_vendor", "윤애드"], ["item_amount", "1000"]])
    );
    expect(missingName).toEqual({ ok: false, error: "1번 지출 항목의 품목을 입력해주세요." });
  });

  it("지출 항목이 없으면 막는다", () => {
    const result = parseExpenseFields(form(expenseBase.slice(0, 3)));
    expect(result).toEqual({ ok: false, error: "지출 항목을 1건 이상 입력해주세요." });
  });

  it("제목이 없으면 막는다", () => {
    const result = parseExpenseFields(form(expenseBase.map(([k, v]) => [k, k === "title" ? " " : v])));
    expect(result).toEqual({ ok: false, error: "제목을 입력해주세요." });
  });
});

describe("parseLeaveFields", () => {
  const leaveBase: [string, string][] = [
    ["drafted_at", "2026-11-09"],
    ["start_date", "2026-11-12"],
    ["end_date", "2026-11-13"],
    ["days", "2"],
    ["leave_type", "연차"],
    ["reason", "개인 사정"],
    ["balance_annual_total", "15"],
  ];
  const withValue = (key: string, value: string) => form(leaveBase.map(([k, v]) => [k, k === key ? value : v]));

  it("정상 입력을 읽는다", () => {
    const result = parseLeaveFields(form(leaveBase));
    expect(result).toEqual({
      ok: true,
      value: expect.objectContaining({
        days: 2,
        leaveType: "연차",
        leaveBalance: {
          annual: { total: "15", priorUsed: "", used: "", remaining: "" },
          substitute: { total: "", priorUsed: "", used: "", remaining: "" },
        },
      }),
    });
  });

  it("종료일이 시작일보다 빠르면 막는다", () => {
    expect(parseLeaveFields(withValue("end_date", "2026-11-11"))).toEqual({
      ok: false,
      error: "휴가 종료일은 시작일보다 빠를 수 없습니다.",
    });
  });

  it("하루짜리 휴가에 1일 넘게 신청하면 막는다", () => {
    const data = form(leaveBase.map(([k, v]) => [k, k === "end_date" ? "2026-11-12" : v]));
    expect(parseLeaveFields(data)).toEqual({
      ok: false,
      error: "휴가기간이 하루인데 신청일수가 1일을 넘을 수 없습니다.",
    });
  });

  it("목록에 없는 휴가종류는 막는다", () => {
    expect(parseLeaveFields(withValue("leave_type", "포상휴가"))).toEqual({
      ok: false,
      error: "휴가종류를 선택해주세요.",
    });
  });
});

describe("readApproverIds", () => {
  it("빈 칸은 건너뛰고 순서대로 모은다", () => {
    expect(readApproverIds(form([["approver_1", "a"], ["approver_2", ""], ["approver_3", "b"]]), 4)).toEqual({
      ok: true,
      value: ["a", "b"],
    });
  });

  it("아무도 고르지 않았거나 같은 사람을 두 번 고르면 막는다", () => {
    expect(readApproverIds(form([]), 4)).toEqual({ ok: false, error: "결재자를 1명 이상 지정해주세요." });
    expect(readApproverIds(form([["approver_1", "a"], ["approver_2", "a"]]), 4)).toEqual({
      ok: false,
      error: "결재자를 중복 없이 지정해주세요.",
    });
  });
});
