import { describe, it, expect } from "vitest";
import { computeRootFontSize, ROOT_FONT_SIZE_SCRIPT } from "./rootFontSize";

describe("computeRootFontSize", () => {
  it("24인치 FHD(배율 100%)는 기준 18px", () => {
    expect(computeRootFontSize(1920, 1, true)).toBe(18);
  });

  it("27인치 4K는 배율에 따라 키운다 (150% = 20px 로 맞춤)", () => {
    expect(computeRootFontSize(2560, 1.5, true)).toBe(20); // 150% (사용자 모니터)
    expect(computeRootFontSize(3072, 1.25, true)).toBe(24); // 125%
    expect(computeRootFontSize(2194, 1.75, true)).toBe(18); // 175%
    expect(computeRootFontSize(3840, 1, true)).toBe(30); // 100% (최대 30px)
  });

  it("27인치 QHD(배율 100%)도 키운다", () => {
    expect(computeRootFontSize(2560, 1, true)).toBe(20);
  });

  it("노트북(작은 화면·높은 배율), 휴대폰, 좁은 화면은 18px 보다 줄이지 않는다", () => {
    expect(computeRootFontSize(1280, 1.5, true)).toBe(18); // 14인치 FHD 150%
    expect(computeRootFontSize(1707, 1.5, true)).toBe(18); // 2560×1600 노트북 150%
    expect(computeRootFontSize(390, 3, false)).toBe(18); // 휴대폰
    expect(computeRootFontSize(1024, 2, true)).toBe(18);
  });

  it("스크립트 안의 함수가 바깥 상수 없이 그대로 동작한다", () => {
    const html = { style: { fontSize: "" } };
    const listeners: string[] = [];
    const fakeWindow = {
      matchMedia: () => ({ matches: true }),
      screen: { width: 2560 },
      devicePixelRatio: 1.5,
      addEventListener: (name: string) => listeners.push(name),
    };
    new Function("window", "document", ROOT_FONT_SIZE_SCRIPT)(fakeWindow, { documentElement: html });
    expect(html.style.fontSize).toBe("20px");
    expect(listeners).toEqual(["resize"]);
  });
});
