/** 글자를 입력하는 중(입력칸·선택칸·편집 영역)이면 true. 단축키는 이때 동작하지 않는다. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/** 한 글자 단축키로 받아도 되는 키 입력인지 (조합키·한글 조합 중·입력칸이면 false) */
export function isPlainShortcut(e: KeyboardEvent): boolean {
  return !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing && !isTypingTarget(e.target);
}
