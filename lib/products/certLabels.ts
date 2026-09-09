/**
 * 인증 항목 key → 화면 라벨. 인증 데이터는 시험성적서 양식에 맞춰 자유 key 를
 * 허용하되, 자주 쓰는 key 는 여기서 한국어 라벨을 붙인다. 없는 key 는 원문 그대로.
 */
export const CERT_KEY_LABEL: Record<string, string> = {
  name: "항목",
  body: "기관",
  standard: "규격",
  number: "번호",
  result: "결과/등급",
  issued: "발급일",
  expires: "유효기간",
  scope: "기준",
  feeds: "총괄표 연동",
  applies_to: "적용 타입",
  note: "비고",
};

export function certKeyLabel(k: string): string {
  return CERT_KEY_LABEL[k] ?? k;
}
