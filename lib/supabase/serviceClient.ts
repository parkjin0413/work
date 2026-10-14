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
        // Next.js 는 한 번의 렌더 안에서 같은 GET fetch 를 메모이즈하고 응답을
        // 캐시하기도 한다. 그 탓에 실패한 응답이 재시도에 그대로 돌아와, 재시도
        // 요청이 네트워크를 아예 타지 않았다(Supabase 로그에 재요청이 안 남았다).
        // 클라이언트를 만들 때마다 다른 헤더를 붙여 요청을 구분시키고, 캐시도 끈다.
        headers: { "x-request-nonce": globalThis.crypto.randomUUID() },
        fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
      },
    }
  );
}
