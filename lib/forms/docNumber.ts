/**
 * 문서번호 매기기. 이미 쓴 번호들 중 가장 큰 순번 + 1 을 쓴다
 * (개수로 세면 중간 문서를 지웠을 때 마지막 번호와 겹친다).
 */

function nextSeq(prefix: string, existing: string[]): string {
  let max = 0;
  for (const docNumber of existing) {
    if (!docNumber.startsWith(prefix)) continue;
    const seq = Number(docNumber.slice(prefix.length));
    if (Number.isInteger(seq) && seq > max) max = seq;
  }
  return String(max + 1).padStart(2, "0");
}

/** 품의서 번호 접두어: "홍보부-2026-" */
export function expenseDocPrefix(department: string, draftedAt: string): string {
  return `${department || "미지정"}-${draftedAt.slice(0, 4)}-`;
}

/** 품의서 번호: "홍보부-2026-10" (부서·기안연도별 순번) */
export function nextExpenseDocNumber(department: string, draftedAt: string, existing: string[]): string {
  const prefix = expenseDocPrefix(department, draftedAt);
  return prefix + nextSeq(prefix, existing);
}

/** 휴가신청서 번호 접두어: "LEA-20261109-1234-" (작성일 + 연락처 끝 4자리) */
export function leaveDocPrefix(today: string, phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const suffix = digits.length >= 4 ? digits.slice(-4) : "0000";
  return `LEA-${today.replace(/-/g, "")}-${suffix}-`;
}

/** 휴가신청서 번호: "LEA-20261109-1234-01" (같은 날 작성한 순번) */
export function nextLeaveDocNumber(today: string, phone: string, existing: string[]): string {
  const prefix = leaveDocPrefix(today, phone);
  return prefix + nextSeq(prefix, existing);
}
