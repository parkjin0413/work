/**
 * 숫자만 저장된 사업자번호·전화번호를 읽기 쉽게 하이픈을 넣어 보여준다.
 * 이미 하이픈 등이 들어 있거나 형식을 모르는 값은 그대로 둔다. (복사할 때는 숫자만 쓴다)
 */
export function formatBusinessNumber(value: string): string {
  return /^\d{10}$/.test(value) ? `${value.slice(0, 3)}-${value.slice(3, 5)}-${value.slice(5)}` : value;
}

export function formatPhoneNumber(value: string): string {
  if (!/^\d+$/.test(value)) return value;
  // 서울 02
  if (value.startsWith("02") && (value.length === 9 || value.length === 10)) {
    return `02-${value.slice(2, value.length - 4)}-${value.slice(-4)}`;
  }
  // 대표번호 15xx·16xx·18xx (8자리)
  if (/^1[5-9]\d{6}$/.test(value)) return `${value.slice(0, 4)}-${value.slice(4)}`;
  // 지역번호·휴대폰·070 등 (0으로 시작하는 10~11자리)
  if (value.startsWith("0") && (value.length === 10 || value.length === 11)) {
    return `${value.slice(0, 3)}-${value.slice(3, value.length - 4)}-${value.slice(-4)}`;
  }
  return value;
}
