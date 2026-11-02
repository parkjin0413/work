import { describe, expect, it } from "vitest";
import { emptyHostingValues } from "@/lib/hosting/fields";
import { expiryLevel, formatDday, siteExpiries } from "./expiry";

describe("호스팅 만료 계산", () => {
  it("남은 일수에 따라 단계를 나눈다", () => {
    expect(expiryLevel(-1)).toBe("expired");
    expect(expiryLevel(0)).toBe("soon");
    expect(expiryLevel(30)).toBe("soon");
    expect(expiryLevel(31)).toBe("ok");
  });

  it("D-day 표기를 만든다", () => {
    expect(formatDday(0)).toBe("D-DAY");
    expect(formatDday(5)).toBe("D-5");
    expect(formatDday(-3)).toBe("D+3");
  });

  it("입력된 만료일만 모아서 반환한다", () => {
    const values = {
      ...emptyHostingValues(),
      siteName: "공식 홈페이지",
      hostingEndDate: "2026-11-13",
      sslEndDate: "2026-10-31",
    };
    const items = siteExpiries({ id: "s1", values }, "2026-11-03");

    expect(items).toEqual([
      { siteId: "s1", siteName: "공식 홈페이지", label: "호스팅", date: "2026-11-13", daysLeft: 10, level: "soon" },
      { siteId: "s1", siteName: "공식 홈페이지", label: "SSL", date: "2026-10-31", daysLeft: -3, level: "expired" },
    ]);
  });
});
