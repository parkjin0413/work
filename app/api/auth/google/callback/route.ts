import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/requireAdmin";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { saveGoogleRefreshToken } from "@/lib/google/tokenStore";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 401 });
    }
    throw error;
  }

  const googleError = request.nextUrl.searchParams.get("error");
  if (googleError) {
    return NextResponse.redirect(new URL(`/gmail?error=${googleError}`, request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/gmail?error=missing_code", request.url));
  }

  const returnedState = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!expectedState || returnedState !== expectedState) {
    return NextResponse.redirect(new URL("/gmail?error=invalid_state", request.url));
  }

  const client = createGoogleOAuthClient();
  let tokens;
  try {
    ({ tokens } = await client.getToken(code));
  } catch {
    return NextResponse.redirect(new URL("/gmail?error=token_exchange_failed", request.url));
  }

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/gmail?error=no_refresh_token", request.url));
  }

  try {
    await saveGoogleRefreshToken(tokens.refresh_token);
  } catch {
    return NextResponse.redirect(new URL("/gmail?error=save_failed", request.url));
  }

  const response = NextResponse.redirect(new URL("/gmail?connected=1", request.url));
  response.cookies.delete(STATE_COOKIE);
  return response;
}
