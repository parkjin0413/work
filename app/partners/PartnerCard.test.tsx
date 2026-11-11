import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Partner } from "@/lib/partners/partnersStore";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
const actions = vi.hoisted(() => ({ updatePartnerAction: vi.fn(), deletePartnerAction: vi.fn() }));
vi.mock("./actions", () => actions);

import { PartnerCard } from "./PartnerCard";

const base: Partner = {
  id: "p1",
  companyName: "강산이엔지",
  representative: "장준호",
  address: null,
  businessNumber: "217-81-18446",
  phone: null,
  email: null,
  bankName: "국민은행",
  accountNumber: "123-45-678901",
  accountHolder: "(주)강산이엔지",
  registrationFileName: "kangsaneng.jpg",
  registrationFileUrl: "https://example.com/reg.jpg",
  registrationFileDownloadUrl: "https://example.com/reg.jpg?download",
  bankbookFileName: "통장사본.pdf",
  bankbookFileUrl: "https://example.com/bank.pdf?token=x",
  bankbookFileDownloadUrl: "https://example.com/bank.pdf?token=y",
};

describe("PartnerCard 은행·통장 사본", () => {
  beforeEach(() => {
    actions.updatePartnerAction.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("은행·계좌번호를 보여주고, 계좌번호는 숫자만 복사한다", async () => {
    render(<PartnerCard partner={base} />);
    expect(screen.getByText("국민은행")).toBeInTheDocument();
    expect(screen.getByText("(주)강산이엔지")).toBeInTheDocument();
    fireEvent.click(screen.getByText("123-45-678901"));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("12345678901"));
  });

  it("사업자등록증 옆에 통장 사본을 나란히 보여준다", () => {
    render(<PartnerCard partner={base} />);
    expect(screen.getByText("사업자등록증")).toBeInTheDocument();
    expect(screen.getByText("통장 사본")).toBeInTheDocument();
    expect(screen.getByText("통장사본.pdf")).toBeInTheDocument();
  });

  it("수정하면 은행명·계좌번호·통장 사본 삭제 여부를 보낸다", async () => {
    render(<PartnerCard partner={base} />);
    fireEvent.click(screen.getByRole("button", { name: "강산이엔지 수정" }));
    fireEvent.change(screen.getByLabelText("은행명"), { target: { value: "신한은행" } });
    fireEvent.click(screen.getByLabelText(/등록된 통장 사본 삭제/));
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() => expect(actions.updatePartnerAction).toHaveBeenCalled());
    const formData = actions.updatePartnerAction.mock.calls[0][0] as FormData;
    expect(formData.get("bankName")).toBe("신한은행");
    expect(formData.get("accountNumber")).toBe("123-45-678901");
    expect(formData.get("accountHolder")).toBe("(주)강산이엔지");
    expect(formData.get("removeBankbookFile")).toBe("true");
  });
});
