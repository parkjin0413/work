/**
 * 끌어서 놓은 결과 계산 (드래그 앤 드롭).
 * items 는 화면 순서대로 정렬된 상태로 넘긴다.
 * - overId 가 항목이면 그 항목 자리에 놓는다 (같은 날 안에서는 위/아래로 자리 바꿈).
 * - overId 가 null 이면(칸 여백에 놓은 경우) 다른 날이면 맨 아래에 넣고, 같은 날이면 그대로 둔다.
 * 반환값: 놓인 날짜와, 그날 항목들의 새 순서(id). 변화가 없으면 null.
 */
export function planDrop<T extends { id: string; date: string | null }>(
  items: T[],
  activeId: string,
  targetDate: string | null,
  overId: string | null,
): { date: string | null; orderedIds: string[] } | null {
  const active = items.find((i) => i.id === activeId);
  if (!active) return null;

  const target = items.filter((i) => i.date === targetDate);

  if (active.date === targetDate) {
    // 같은 날 칸의 빈 곳(제목·입력칸 위)에 놓으면 그대로 둔다.
    if (!overId) return null;
    const from = target.findIndex((i) => i.id === activeId);
    const to = target.findIndex((i) => i.id === overId);
    if (to < 0 || from === to) return null;
    const next = [...target];
    next.splice(from, 1);
    next.splice(to, 0, active);
    return { date: targetDate, orderedIds: next.map((i) => i.id) };
  }

  const rest = target.filter((i) => i.id !== activeId);
  const overIndex = overId ? rest.findIndex((i) => i.id === overId) : -1;
  const at = overIndex < 0 ? rest.length : overIndex;
  const next = [...rest.slice(0, at), active, ...rest.slice(at)];
  return { date: targetDate, orderedIds: next.map((i) => i.id) };
}
