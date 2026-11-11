import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("./actions", () => ({}));

import { StatementForm } from "./StatementForm";

const drafter = { name: "박진", department: "홍보부", position: "차장", phone: "" };
const suggestions = [
  {
    description: "양주 사무실(회암동) → 서울 사무실(창동)",
    kind: "car" as const,
    distance: 32,
    amount: 0,
    note: "",
    count: 2,
  },
  {
    description: "삼육오 감자탕 - 점심 식사 2명",
    kind: "general" as const,
    distance: null,
    amount: 24000,
    note: "",
    count: 2,
  },
];

function renderForm() {
  return render(
    <StatementForm
      mode="create"
      action={vi.fn()}
      drafter={drafter}
      stampUrl={null}
      cancelHref="/forms"
      suggestions={suggestions}
      initial={{
        writtenAt: "2026-11-02",
        fuelPrice: "1869",
        rows: [{ kind: "general", date: "2026-10-01", description: "", amount: "", distance: "", note: "" }],
      }}
    />,
  );
}

describe("StatementForm", () => {
  it("지난 내역을 고르면 자차로 바뀌고 거리와 금액(110%)이 채워진다", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("1번 내용"), {
      target: { value: "양주 사무실(회암동) → 서울 사무실(창동)" },
    });

    expect(screen.getByRole("radio", { name: "자차" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("1번 거리(km)")).toHaveValue("32");
    expect(screen.getByText("6,579원")).toBeInTheDocument();
  });

  it("일반 내역을 고르면 금액이 채워진다", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("1번 내용"), { target: { value: "삼육오 감자탕 - 점심 식사 2명" } });
    expect(screen.getByLabelText("1번 금액")).toHaveValue("24,000");
  });

  it("복사 버튼은 같은 줄을 바로 아래에 하나 더 만든다", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("1번 내용"), { target: { value: "삼육오 감자탕 - 점심 식사 2명" } });
    fireEvent.click(screen.getByRole("button", { name: "1번 줄 복사" }));

    expect(screen.getByLabelText("2번 내용")).toHaveValue("삼육오 감자탕 - 점심 식사 2명");
    expect(screen.getByLabelText("2번 금액")).toHaveValue("24,000");
    expect(screen.getByLabelText("2번 날짜")).toHaveValue("2026-10-01");
    expect(screen.getByText("합계 48,000원")).toBeInTheDocument();
  });

  it("자동완성 후보 목록을 내용 칸에 연결한다", () => {
    const { container } = renderForm();
    const list = container.querySelector("datalist#statement-suggestions") as HTMLElement;
    expect(within(list).getAllByRole("option", { hidden: true })).toHaveLength(2);
    expect(screen.getByLabelText("1번 내용")).toHaveAttribute("list", "statement-suggestions");
  });
});
