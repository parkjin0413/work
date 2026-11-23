/** 마이그레이션 전이라 열이 없을 때 나는 오류인지 (Postgres 42703, PostgREST PGRST204) */
export function isMissingColumnError(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}
