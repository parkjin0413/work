import { describe, it, expect } from "vitest";
import { toWorkItemsCsv } from "./exportCsv";
import type { WorkItem } from "./workItems";

const base: Omit<WorkItem, "id" | "date" | "body" | "status"> = {
  projectId: null,
  projectName: null,
  scheduleId: null,
  sortOrder: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
};

describe("toWorkItemsCsv", () => {
  it("BOM + 머리줄, 쉼표·따옴표·줄바꿈은 감싼다", () => {
    const csv = toWorkItemsCsv([
      { ...base, id: "1", date: "2026-11-09", body: "A, B", status: "done", projectName: "홈페이지" },
      { ...base, id: "2", date: "2026-11-10", body: '"C"\n D', status: "planned" },
    ]);

    expect(csv.startsWith("\uFEFF날짜,요일,상태,프로젝트,내용\r\n")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[1]).toBe('2026-11-09,월,완료,홈페이지,"A, B"');
    expect(lines[2]).toBe('2026-11-10,화,계획,,"""C""\n D"');
  });
});
