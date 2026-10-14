/** 재시도 간격(ms). 짧게 한 번, 조금 길게 한 번 더 시도한다. */
const RETRY_DELAYS_MS = [300, 900];

/**
 * Supabase 조회를 최대 두 번까지 재시도한다.
 *
 * 유효한 서비스 키인데도 게이트웨이가 간헐적으로 401 을 돌려주거나(실측: 같은 키로
 * 33건 성공·1건 401, 그때만 응답이 461ms 로 느렸다), 서버리스 콜드 스타트 직후
 * 첫 연결이 실패하는 경우가 있다. 둘 다 곧바로 다시 부르면 성공하므로, 재시도가
 * 없으면 사용자는 "들어가면 에러, 새로고침하면 정상"을 겪게 된다.
 * 조회(및 있으면-건너뛰는 생성)만 다루므로 재시도해도 안전하다.
 */
export async function withRetry<T>(load: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt - 1]));
    }

    try {
      return await load();
    } catch (error) {
      lastError = error;
      console.warn(`[${label}] 조회 실패 (${attempt + 1}번째 시도):`, error);
    }
  }

  throw lastError;
}
