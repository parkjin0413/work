import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { resolveRedirect } from "@/lib/auth/resolveRedirect";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = resolveRedirect(
    request.nextUrl.pathname,
    user ? { email: user.email } : null
  );

  if (redirectTo) {
    // 로그인은 되어 있으나 관리자 권한이 없는 경우(또는 ADMIN_EMAIL 설정 오류)에는
    // 세션을 정리하고 이유를 로그인 화면에 전달해 무한 리다이렉트처럼 보이지 않게 한다.
    const isRejectedNonAdmin = redirectTo === "/login" && user !== null;
    if (isRejectedNonAdmin) {
      await supabase.auth.signOut();
    }

    const redirectTarget = isRejectedNonAdmin ? "/login?error=not_admin" : redirectTo;
    const redirectResponse = NextResponse.redirect(new URL(redirectTarget, request.url));
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
