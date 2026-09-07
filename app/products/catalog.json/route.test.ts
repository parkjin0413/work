import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("GET /products/catalog.json", () => {
  it("전 제품을 담은 JSON 을 application/json 으로 반환한다", async () => {
    const res = GET();
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json();
    expect(typeof body.generatedAt).toBe("string");
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products).toHaveLength(12);
    const slugs = body.products.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain("laminate-tile-hpl");
    expect(slugs).toContain("emotion-sheet");
    expect(slugs).toContain("anti-slip-flooring");
    expect(slugs).toContain("homogeneous-flooring");
    expect(slugs).toContain("gypsonic-gypsum-ceiling");
  });
});
