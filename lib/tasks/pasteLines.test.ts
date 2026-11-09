import { describe, it, expect } from "vitest";
import { splitPastedLines } from "./pasteLines";

describe("splitPastedLines", () => {
  it("엑셀 한 칸(따옴표로 감싼 여러 줄)을 번호 없이 한 줄씩 나눈다", () => {
    expect(splitPastedLines('"1. 전체 사이트맵 확정\n2. 게시판 ""테이블"" 설계\n3. 권한 설계"\r\n')).toEqual([
      "전체 사이트맵 확정",
      '게시판 "테이블" 설계',
      "권한 설계",
    ]);
  });

  it("여러 칸·글머리표·빈 줄도 정리한다", () => {
    expect(splitPastedLines("- A\t• B\r\n\r\n① C\n2) D")).toEqual(["A", "B", "C", "D"]);
  });

  it("숫자로 시작하는 내용은 번호 표시가 없으면 그대로 둔다", () => {
    expect(splitPastedLines("8.3 버전 적용\n301 리다이렉트")).toEqual(["8.3 버전 적용", "301 리다이렉트"]);
  });
});
