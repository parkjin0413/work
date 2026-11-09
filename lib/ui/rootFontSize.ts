/**
 * 모니터에 맞춘 기준 글자 크기(html font-size).
 *
 * 기준은 24인치 1920×1080(배율 100%) = 18px. 화면의 CSS 1px 이 실제로 몇 mm 인지 어림해서,
 * 다른 모니터에서도 글자가 24인치 FHD 와 비슷한 크기로 보이게 키운다 (큰 모니터는 약간 덜 키운다).
 * Tailwind 크기·여백이 전부 rem 이라 이 값 하나로 화면 전체가 같은 비율로 커진다.
 *
 * 브라우저는 모니터 인치를 알려주지 않으므로 물리 해상도로 흔한 크기를 가정한다.
 *   - 5K(5120)  → 27인치 (픽셀 0.1166mm)
 *   - 4K(3840)  → 27인치 (0.1554mm)  예: 배율 150% → 20px, 125% → 24px
 *   - QHD(2560)·울트라와이드(3440) → 27·34인치 (약 0.233mm) → 배율 100% 에서 20px
 *   - FHD 이하 → 24인치로 보고 18px 그대로
 * 노트북처럼 화면이 작고 배율이 높은 경우 계산값이 18px 보다 작게 나오는데, 줄이지는 않는다(최소 18px).
 * 휴대폰·태블릿(마우스 없음)과 좁은 화면은 건드리지 않는다.
 */
export const BASE_ROOT_PX = 18;

// 아래 스크립트에 함수 본문을 그대로 넣으므로, 바깥 상수를 쓰지 않고 숫자를 안에 둔다.
export function computeRootFontSize(screenWidth: number, devicePixelRatio: number, hasFinePointer: boolean): number {
  const base = 18; // 24인치 FHD 기준 글자 크기
  const baseMm = 0.2767; // 24인치 FHD, 배율 100% 의 CSS 1px 실제 크기
  if (!hasFinePointer || screenWidth < 1280 || !(devicePixelRatio > 0)) return base;

  const physicalWidth = Math.round(screenWidth * devicePixelRatio);
  const pixelMm = physicalWidth >= 5000 ? 0.1166 : physicalWidth >= 3800 ? 0.1554 : physicalWidth >= 2500 ? 0.2331 : 0;
  if (!pixelMm) return base;

  // 실제 크기를 똑같이 맞추면(4K 150% → 21.4px) 사용자 체감으로는 컸다.
  // 큰 모니터는 조금 떨어져서 보므로 0.936 을 곱해 27인치 4K 150% 를 20px 에 맞춘다 (2026-11-09 사용자 확인).
  const fit = 0.936;
  const size = (base * baseMm * fit) / (pixelMm * devicePixelRatio);
  return Math.min(30, Math.max(base, Math.round(size * 2) / 2));
}

/**
 * <head> 에 넣어 첫 화면이 그려지기 전에 실행하는 스크립트.
 * 창을 다른 모니터로 옮기거나 배율을 바꾸면 다시 계산한다.
 */
export const ROOT_FONT_SIZE_SCRIPT = `(function(){
  var compute = ${computeRootFontSize.toString()};
  function apply(){
    try {
      var fine = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
      var px = compute(window.screen.width, window.devicePixelRatio || 1, fine);
      document.documentElement.style.fontSize = px === ${BASE_ROOT_PX} ? "" : px + "px";
    } catch (e) {}
  }
  apply();
  window.addEventListener("resize", apply);
})();`;
