import { describe, it, expect } from "vitest";
import { fixUploadedFileName } from "./fileName";

describe("fixUploadedFileName", () => {
  it("Latin-1 로 깨진 한글 이름을 되돌린다", () => {
    const broken = Buffer.from("통장사본(더패스트).jpg", "utf8").toString("latin1");
    expect(fixUploadedFileName(broken)).toBe("통장사본(더패스트).jpg");
  });

  it("영어 이름과 이미 올바른 한글 이름은 그대로 둔다", () => {
    expect(fixUploadedFileName("kangsaneng.jpg")).toBe("kangsaneng.jpg");
    expect(fixUploadedFileName("통장사본.jpg")).toBe("통장사본.jpg");
  });

  it("원래 Latin-1 글자인 이름(예: café)은 깨진 것으로 보지 않는다", () => {
    expect(fixUploadedFileName("café.pdf")).toBe("café.pdf");
  });
});
