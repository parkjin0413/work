/** 통합 검색(Ctrl+K) 결과 묶음 순서 = 상단 메뉴 순서. 브라우저에서도 쓰므로 서버 코드와 분리해 둔다. */
export const SEARCH_GROUPS = ["업무", "일정", "양식", "어카운트", "회사", "웹", "제품"] as const;
export type SearchGroup = (typeof SEARCH_GROUPS)[number];

/** 통합 검색 결과 한 줄 */
export type SearchHit = { group: SearchGroup; title: string; detail: string | null; href: string };
