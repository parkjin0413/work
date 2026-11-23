import { describe, expect, it } from "vitest";
import { buildQuoteText } from "./copyText";
import type { Product } from "./productsStore";

describe("buildQuoteText", () => {
  it("타입마다 탭으로 나눈 한 줄, 빈 칸은 뺀다", () => {
    const product = {
      name: "흡음패널",
      productType: "벽 흡음재",
      material: "폴리에스터",
      types: [
        { group: "", typeName: "A형", sizeWxhxt: "600×600×9", composition: "단판", weight: "" },
        { group: "대형", typeName: "B형", sizeWxhxt: "1200×600×12", composition: "", weight: "2.1kg" },
      ],
    } as unknown as Product;
    expect(buildQuoteText(product)).toBe(
      "흡음패널 (벽 흡음재)\nA형\t600×600×9\t단판\n[대형] B형\t1200×600×12\t2.1kg\n소재\t폴리에스터",
    );
  });
});
