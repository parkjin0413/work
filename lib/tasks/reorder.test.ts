import { describe, it, expect } from "vitest";
import { planDrop } from "./reorder";

const items = [
  { id: "a", date: "2026-11-09" },
  { id: "b", date: "2026-11-09" },
  { id: "c", date: "2026-11-09" },
  { id: "x", date: "2026-11-10" },
];

describe("planDrop", () => {
  it("같은 날 안에서 아래로·위로 자리를 바꾼다", () => {
    expect(planDrop(items, "a", "2026-11-09", "c")).toEqual({ date: "2026-11-09", orderedIds: ["b", "c", "a"] });
    expect(planDrop(items, "c", "2026-11-09", "a")).toEqual({ date: "2026-11-09", orderedIds: ["c", "a", "b"] });
  });

  it("제자리에 놓으면 변화 없음", () => {
    expect(planDrop(items, "b", "2026-11-09", "b")).toBeNull();
    expect(planDrop(items, "c", "2026-11-09", null)).toBeNull();
    expect(planDrop(items, "a", "2026-11-09", null)).toBeNull();
  });

  it("다른 날 항목 위에 놓으면 그 앞에, 빈 곳이면 맨 아래에 넣는다", () => {
    expect(planDrop(items, "b", "2026-11-10", "x")).toEqual({ date: "2026-11-10", orderedIds: ["b", "x"] });
    expect(planDrop(items, "b", "2026-11-10", null)).toEqual({ date: "2026-11-10", orderedIds: ["x", "b"] });
    expect(planDrop(items, "a", "2026-11-11", null)).toEqual({ date: "2026-11-11", orderedIds: ["a"] });
  });
});
