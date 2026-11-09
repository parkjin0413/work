import { describe, it, expect } from "vitest";
import { splitIntoColumns } from "./columns";

describe("splitIntoColumns", () => {
  it("순서를 지키며 가장 긴 단이 최소가 되게 나눈다", () => {
    // 12, 7, 4, 5, 4 → [12] [7, 4] [5, 4]
    expect(splitIntoColumns([12, 7, 4, 5, 4], 3)).toEqual([[0], [1, 2], [3, 4]]);
  });

  it("한 단이면 전부 한 단에", () => {
    expect(splitIntoColumns([1, 2, 3], 1)).toEqual([[0, 1, 2]]);
  });

  it("카드가 단 수보다 적으면 남는 단은 빈 단", () => {
    expect(splitIntoColumns([3, 4], 4)).toEqual([[0], [1], [], []]);
    expect(splitIntoColumns([], 3)).toEqual([[], [], []]);
  });

  it("모든 카드를 한 번씩만, 빠짐없이 담는다", () => {
    const weights = [3, 5, 2, 8, 1, 4, 6, 2, 3];
    const flat = splitIntoColumns(weights, 4).flat();
    expect(flat).toEqual(weights.map((_, i) => i));
  });
});
