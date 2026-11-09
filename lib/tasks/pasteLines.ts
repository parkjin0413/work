/**
 * 붙여넣은 글을 항목 여러 개로 나눈다.
 * - 엑셀 한 칸(여러 줄)을 복사하면 앞뒤에 따옴표가 붙고 안의 " 는 "" 가 된다 → 벗긴다.
 * - 여러 칸을 복사하면 탭·줄바꿈으로 나뉜다.
 * - 줄 앞의 "1." "2)" "-" "•" "①" 같은 번호·글머리표는 지운다.
 */
export function splitPastedLines(text: string): string[] {
  return text
    .split(/\r?\n|\t/)
    .map((part) => part.trim())
    .map((part) => part.replace(/^"/, "").replace(/"$/, "").replace(/""/g, '"').trim())
    .map((part) => part.replace(/^(?:\d{1,3}[.)](?=\s|$)|[-•·*▪◦]|[①-⑳])\s*/, "").trim())
    .filter(Boolean);
}
