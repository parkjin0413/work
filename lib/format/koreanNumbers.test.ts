import { describe, it, expect } from "vitest";
import { formatBusinessNumber, formatPhoneNumber } from "./koreanNumbers";

describe("formatBusinessNumber", () => {
  it("10자리 숫자를 3-2-5 로", () => {
    expect(formatBusinessNumber("2178118446")).toBe("217-81-18446");
    expect(formatBusinessNumber("217-81-18446")).toBe("217-81-18446");
    expect(formatBusinessNumber("123")).toBe("123");
  });
});

describe("formatPhoneNumber", () => {
  it("서울·지역번호·휴대폰·대표번호", () => {
    expect(formatPhoneNumber("0232960482")).toBe("02-3296-0482");
    expect(formatPhoneNumber("029980481")).toBe("02-998-0481");
    expect(formatPhoneNumber("0318688878")).toBe("031-868-8878");
    expect(formatPhoneNumber("01093695222")).toBe("010-9369-5222");
    expect(formatPhoneNumber("15881234")).toBe("1588-1234");
  });

  it("형식을 모르거나 이미 하이픈이 있으면 그대로", () => {
    expect(formatPhoneNumber("02-3296-0482")).toBe("02-3296-0482");
    expect(formatPhoneNumber("12345")).toBe("12345");
  });
});
