import { describe, it, expect } from "vitest";
import { buildDocumentOverlays } from "./overlays";

describe("buildDocumentOverlays", () => {
  it("품의서는 기안일에 문서번호·제목, 경비내역서는 작성일에 합계로 표시하고 문서로 가는 주소를 단다", () => {
    const items = buildDocumentOverlays(
      [{ id: "r1", doc_number: "홍보부-2026-09", title: "호스팅 구입의 건", drafted_at: "2026-11-02" }],
      [{ id: "s1", written_at: "2026-11-02", total_amount: "106852" }]
    );

    expect(items).toEqual([
      {
        id: "doc-expense-r1",
        kind: "document",
        date: "2026-11-02",
        title: "품의서 홍보부-2026-09 · 호스팅 구입의 건",
        detail: "품의서",
        href: "/forms/expense/r1",
      },
      {
        id: "doc-statement-s1",
        kind: "document",
        date: "2026-11-02",
        title: "경비내역서 · 106,852원",
        detail: "경비내역서",
        href: "/forms/statement/s1",
      },
    ]);
  });
});
