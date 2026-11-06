// 어카운트·북마크 메뉴: 기존 계정관리(accounts)·즐겨찾기(favorites) 데이터를 한 화면용 목록으로 합친다. DB 구조는 그대로 쓴다.

export type SiteItem = {
  id: string;
  /** 원래 테이블(accounts / favorites)의 id */
  rawId: string;
  source: "account" | "favorite";
  name: string;
  url: string;
  username: string | null;
  password: string | null;
  memo: string | null;
  /** 원래 메뉴의 분류 이름과 id */
  originalCategory: string;
  categoryId: string;
};

export type SiteGroup = { name: string; categoryId: string | null; items: SiteItem[] };


/** 기존 분류 그대로 묶는다 (들어온 순서 = 분류 정렬 순서). */
export function groupByOriginal(items: SiteItem[]): SiteGroup[] {
  const groups = new Map<string, SiteItem[]>();
  for (const item of items) {
    if (!groups.has(item.originalCategory)) groups.set(item.originalCategory, []);
    groups.get(item.originalCategory)!.push(item);
  }
  return Array.from(groups, ([name, groupItems]) => ({ name, categoryId: groupItems[0]?.categoryId ?? null, items: groupItems }));
}

export function matchesQuery(item: SiteItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [item.name, item.url, item.username ?? "", item.memo ?? "", item.originalCategory].some((v) =>
    v.toLowerCase().includes(q)
  );
}

/**
 * 화면 표시용 주소: https://, www., 쿼리(?...)·해시(#...), 끝의 / 를 떼어 읽기 쉽게 만든다.
 * 예) https://www.tving.com/?utm_source=naver → tving.com
 *     https://kangsan21.com/bbs/mzsolution/login.php → kangsan21.com/bbs/mzsolution/login.php
 */
export function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.host.replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  }
}
