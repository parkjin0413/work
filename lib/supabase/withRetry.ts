/**
 * Supabase 조회를 한 번 재시도한다.
 *
 * 서버리스(콜드 스타트) 환경에서는 인스턴스가 깨어난 직후 첫 외부 요청이
 * DNS/TLS 연결 문제로 드물게 실패한다("fetch failed" 류). 이 경우 곧바로 다시
 * 부르면 성공하는데, 재시도가 없으면 사용자는 "들어가면 에러, 새로고침하면 정상"을
 * 겪게 된다. 조회(및 있으면-건너뛰는 생성)만 다루므로 재시도해도 안전하다.
 */
export async function withRetry<T>(load: () => Promise<T>, label: string): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.warn(`[${label}] 첫 조회 실패, 재시도합니다:`, error);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return load();
  }
}
