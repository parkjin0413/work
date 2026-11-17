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

  it("스크립트: 첫 계산 후, 창을 다른 모니터로 옮기면(배율 변화) 다시 계산한다", () => {
    const html = { style: { fontSize: "" } };
    const windowListeners: Record<string, () => void> = {};
    const docListeners: Record<string, () => void> = {};
    const mediaListeners: (() => void)[] = [];
    const fakeWindow = {
      matchMedia: (query: string) => ({
        matches: query.includes("pointer"),
        addEventListener: (_: string, fn: () => void) => mediaListeners.push(fn),
        removeEventListener: () => {},
      }),
      screen: { width: 2560 },
      devicePixelRatio: 1.5,
      addEventListener: (name: string, fn: () => void) => (windowListeners[name] = fn),
    };
    const fakeDocument = {
      documentElement: html,
      hidden: false,
      addEventListener: (name: string, fn: () => void) => (docListeners[name] = fn),
    };
    new Function("window", "document", ROOT_FONT_SIZE_SCRIPT)(fakeWindow, fakeDocument);

    // 27인치 4K(150%) 모니터에서 처음 열림 → 20px
    expect(html.style.fontSize).toBe("20px");
    expect(Object.keys(windowListeners).sort()).toEqual(["focus", "load", "pageshow", "resize"]);
    expect(Object.keys(docListeners)).toEqual(["visibilitychange"]);

    // FHD(100%) 모니터로 옮김 → 배율이 바뀌어 기준 18px(기본값)로
    fakeWindow.screen.width = 1920;
    fakeWindow.devicePixelRatio = 1;
    mediaListeners[mediaListeners.length - 1]();
    expect(html.style.fontSize).toBe("");

    // 다시 4K 모니터로 와서 창을 누르면(focus) 20px
    fakeWindow.screen.width = 2560;
    fakeWindow.devicePixelRatio = 1.5;
    windowListeners.focus();
    expect(html.style.fontSize).toBe("20px");
  });
});
