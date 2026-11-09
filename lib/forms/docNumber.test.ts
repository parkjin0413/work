import { describe, it, expect } from "vitest";
import { nextExpenseDocNumber, nextLeaveDocNumber } from "./docNumber";

describe("nextExpenseDocNumber", () => {
  it("같은 부서·연도의 가장 큰 순번 다음 번호를 쓴다 (옮겨온 9건 다음은 10)", () => {
    const existing = Array.from({ length: 9 }, (_, i) => `홍보부-2026-${String(i + 1).padStart(2, "0")}`);
    expect(nextExpenseDocNumber("홍보부", "2026-11-09", existing)).toBe("홍보부-2026-10");
  });

  it("중간 문서를 지워도 마지막 번호와 겹치지 않는다", () => {
    expect(nextExpenseDocNumber("홍보부", "2026-11-09", ["홍보부-2026-01", "홍보부-2026-03"])).toBe(
      "홍보부-2026-04"
    );
  });

  it("해가 바뀌면 01부터, 부서가 없으면 '미지정'", () => {
    expect(nextExpenseDocNumber("홍보부", "2027-01-02", ["홍보부-2026-12"])).toBe("홍보부-2027-01");
    expect(nextExpenseDocNumber("", "2026-11-09", [])).toBe("미지정-2026-01");
  });
});

describe("nextLeaveDocNumber", () => {
  it("작성일 + 연락처 끝 4자리 + 그날 순번", () => {
    expect(nextLeaveDocNumber("2026-11-09", "010-1234-5678", [])).toBe("LEA-20261109-5678-01");
    expect(nextLeaveDocNumber("2026-11-09", "010-1234-5678", ["LEA-20261109-5678-01"])).toBe(
      "LEA-20261109-5678-02"
    );
  });

  it("연락처가 없으면 0000", () => {
    expect(nextLeaveDocNumber("2026-11-09", "", [])).toBe("LEA-20261109-0000-01");
  });
});
