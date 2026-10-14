import { createClient } from "@supabase/supabase-js";

export function createSupabaseServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        // Next.js 가 fetch 를 가로채 응답을 캐시하면, 실패한 응답을 다시 받아
        // 재시도가 네트워크를 타지 않는 일이 생긴다(실제로 간헐적 401 이 재시도에서
        // 그대로 되돌아왔다). 데이터 조회는 항상 실제 요청을 보내게 고정한다.
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
