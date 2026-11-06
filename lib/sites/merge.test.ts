import { describe, expect, it } from "vitest";
import { matchesQuery, type SiteItem } from "./merge";

function item(partial: Partial<SiteItem>): SiteItem {
  return {
    id: partial.id ?? "x",
    rawId: partial.rawId ?? "x",
    categoryId: partial.categoryId ?? "c",
    source: partial.source ?? "favorite",
    name: partial.name ?? "이름",
    url: partial.url ?? "https://example.com",
    username: partial.username ?? null,
    password: partial.password ?? null,
    memo: partial.memo ?? null,
    originalCategory: partial.originalCategory ?? "업무",
  };
}

describe("어카운트·북마크 목록", () => {
  it("이름·주소·아이디·메모로 검색한다", () => {
    const target = item({ name: "카페24", url: "https://hosting.cafe24.com", username: "kangsan", memo: "더패스트용" });
    expect(["카페", "cafe24", "kangsan", "더패스트"].every((q) => matchesQuery(target, q))).toBe(true);
    expect(matchesQuery(target, "네이버")).toBe(false);
  });
});

describe("표시용 주소", () => {
  it("프로토콜·www·쿼리·해시·끝 슬래시를 뗀다", async () => {
    const { displayUrl } = await import("./merge");
    expect(displayUrl("https://www.tving.com/?utm_source=naver&x=1")).toBe("tving.com");
    expect(displayUrl("https://kangsan21.com/bbs/mzsolution/login.php")).toBe("kangsan21.com/bbs/mzsolution/login.php");
    expect(displayUrl("https://121.65.27.134:5555/webpages/index.html")).toBe("121.65.27.134:5555/webpages/index.html");
    expect(displayUrl("https://loveisdeep.synology.me:9413/#/signin")).toBe("loveisdeep.synology.me:9413");
  });
});

describe("분류별로 담기", () => {
  it("빈 분류도 보여주고, 검색 중에는 빈 분류를 뺀다", async () => {
    const { buildGroups } = await import("./merge");
    const categories = [
      { id: "c1", name: "홈페이지", source: "account" as const },
      { id: "c2", name: "새 분류", source: "account" as const },
    ];
    const items = [item({ id: "1", categoryId: "c1" })];
    expect(buildGroups(categories, items, true).map((g) => [g.name, g.items.length])).toEqual([
      ["홈페이지", 1],
      ["새 분류", 0],
    ]);
    expect(buildGroups(categories, items, false).map((g) => g.name)).toEqual(["홈페이지"]);
  });
});
