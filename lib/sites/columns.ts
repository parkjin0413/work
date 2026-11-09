import type { SiteGroup } from "./merge";

/**
 * 분류 카드들을 N단으로 나눈다. 순서는 그대로 두고(1단 위→아래, 다음 단…) 앞에서부터 잘라,
 * 가장 긴 단이 최대한 짧아지게 한다. 예전에는 브라우저 다단 배치(CSS columns)에 맡겼는데,
 * 맥 Safari 에서 카드 높이가 조금만 바뀌어도 단을 다시 나눠 카드가 옆 단으로 튀고 깜빡였다.
 * 단마다 길이의 제곱 합이 가장 작게 나눠, 가장 긴 단뿐 아니라 모든 단이 고르게 되게 한다.
 */
export function splitIntoColumns(weights: number[], columns: number): number[][] {
  const n = weights.length;
  const k = Math.max(1, Math.min(columns, n));
  if (n === 0) return Array.from({ length: Math.max(1, columns) }, () => []);

  const prefix = [0];
  for (const w of weights) prefix.push(prefix[prefix.length - 1] + w);
  const sum = (from: number, to: number) => prefix[to] - prefix[from];

  // best[j][i]: 앞의 i개를 j단으로 나눴을 때의 비용(단 길이 제곱 합), cut[j][i]: 마지막 단이 시작하는 위치
  const best = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity));
  const cut = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
  best[0][0] = 0;
  for (let j = 1; j <= k; j += 1) {
    for (let i = j; i <= n; i += 1) {
      for (let s = j - 1; s < i; s += 1) {
        const value = best[j - 1][s] + sum(s, i) ** 2;
        if (value < best[j][i]) {
          best[j][i] = value;
          cut[j][i] = s;
        }
      }
    }
  }

  const result: number[][] = [];
  let end = n;
  for (let j = k; j >= 1; j -= 1) {
    const start = cut[j][end];
    result.unshift(Array.from({ length: end - start }, (_, i) => start + i));
    end = start;
  }
  // 카드가 단 수보다 적으면 남는 단은 비워 둔다 (폭은 그대로)
  while (result.length < columns) result.push([]);
  return result;
}

/**
 * 카드 대략 높이 (항목 한 줄 = 1). 실제 화면에서 잰 비율: 제목 줄 + 카드 사이 간격 ≈ 0.95줄,
 * 메모 한 줄 ≈ 0.4줄 (메모가 길면 줄 수만큼).
 */
export function groupWeight(group: SiteGroup): number {
  return (
    0.95 +
    group.items.reduce((sum, item) => sum + 1 + (item.memo ? 0.4 * Math.ceil(item.memo.length / 45) : 0), 0)
  );
}
