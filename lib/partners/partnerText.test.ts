import { describe, expect, it } from "vitest";
import { buildPartnerText } from "./partnerText";

describe("buildPartnerText", () => {
  it("빈 칸은 빼고 번호는 하이픈을 넣는다", () => {
    expect(
      buildPartnerText({
        companyName: "강산이엔지",
        representative: "홍길동",
        address: null,
        businessNumber: "1234567890",
        phone: "0212345678",
        email: "",
        bankName: "기업은행",
        accountNumber: "123-456",
        accountHolder: "강산이엔지",
      }),
    ).toBe(
      "상호: 강산이엔지\n대표자: 홍길동\n사업자번호: 123-45-67890\n전화번호: 02-1234-5678\n계좌: 기업은행 123-456 예금주 강산이엔지",
    );
  });
});
