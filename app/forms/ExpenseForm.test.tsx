import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("./actions", () => ({}));

import { ExpenseForm } from "./ExpenseForm";
import { LeavePaper, formatKoreanDate } from "./LeavePaper";
import { EMPTY_LEAVE_BALANCE_ENTRY } from "@/lib/forms/types";

const candidates = [
  { id: "ceo", name: "장준호", position: "대표이사", department: "대표" },
  { id: "m1", name: "백지혜", position: "부장", department: "관리부" },
];
const drafter = { name: "박진", department: "홍보부", position: "차장", phone: "" };

function renderForm() {
  return render(
    <ExpenseForm
      mode="create"
      action={vi.fn()}
      drafter={drafter}
      candidates={candidates}
      stampUrl={null}
      cancelHref="/forms"
      initial={{
        draftedAt: "2026-11-09",
        title: "",
        content: "",
        items: [],
        consultations: [],
        instructions: "",
        approverIds: ["ceo"],
        attachmentTypes: [],
        attachmentOther: "",
      }}
    />
  );
}

describe("ExpenseForm", () => {
  it("입력한 금액을 쉼표로 보여주고 미리보기 합계에 반영한다", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText("1번 품목"), { target: { value: "명함" } });
    fireEvent.change(screen.getByLabelText("1번 금액"), { target: { value: "120000" } });
    fireEvent.click(screen.getByRole("button", { name: "+ 항목 추가" }));
    fireEvent.change(screen.getByLabelText("2번 품목"), { target: { value: "리플렛" } });
    fireEvent.change(screen.getByLabelText("2번 금액"), { target: { value: "30,000" } });

    expect(screen.getByLabelText("1번 금액")).toHaveValue("120,000");
    expect(screen.getByText("합계 150,000원")).toBeInTheDocument();
    expect(screen.getByText("150,000원")).toBeInTheDocument();
  });

  it("미리 고른 결재자가 결재란에 보이고, 결재자 값을 approver_N 으로 보낸다", () => {
    const { container } = renderForm();

    expect(screen.getByLabelText("1차 결재자")).toHaveValue("ceo");
    expect(container.querySelector('input[name="approver_1"]')).toHaveValue("ceo");
    const sheet = container.querySelector(".print-sheet") as HTMLElement;
    expect(within(sheet).getByText("대표이사")).toBeInTheDocument();
    expect(within(sheet).getByText("장준호")).toBeInTheDocument();
  });

  it("협의처는 3개까지만 추가할 수 있다", () => {
    renderForm();
    const add = screen.getByRole("button", { name: "+ 협의처 추가" });
    fireEvent.click(add);
    fireEvent.click(add);
    expect(screen.getByLabelText("3번 협의처")).toBeInTheDocument();
    expect(add).toBeDisabled();
  });
});

describe("LeavePaper", () => {
  it("휴가기간을 요일과 함께 적고, 대행자가 없으면 x 로 적는다", () => {
    render(
      <LeavePaper
        drafterName="박진"
        drafterPosition="차장"
        department="홍보부"
        draftedAt="2026-11-09"
        startDate="2026-11-12"
        endDate="2026-11-13"
        days={2}
        leaveType="연차"
        reason="개인 사정"
        substituteJobTitle=""
        substituteName=""
        leaveBalance={{ annual: EMPTY_LEAVE_BALANCE_ENTRY, substitute: EMPTY_LEAVE_BALANCE_ENTRY }}
        approvers={[{ order: 1, name: "장준호", jobTitle: "대표이사" }]}
      />
    );

    expect(screen.getByText("2026년 11월 12일(목) 부터")).toBeInTheDocument();
    expect(screen.getByText(/직위 : x/)).toBeInTheDocument();
    expect(screen.getByText("위와 같이 휴가(연차)를 신청하오니 결재하여 주시기 바랍니다.")).toBeInTheDocument();
  });

  it("formatKoreanDate 는 잘못된 값이면 그대로 둔다", () => {
    expect(formatKoreanDate("2026-11-09")).toBe("2026년 11월 9일(월)");
    expect(formatKoreanDate("")).toBe("-");
  });
});
