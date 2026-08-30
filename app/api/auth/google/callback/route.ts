import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/requireAdmin";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { saveGoogleRefreshToken } from "@/lib/google/tokenStore";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 401 });
    }
    throw error;
  }

  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/gmail?error=missing_code", request.url));
  }

  const client = createGoogleOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.redirect(new URL("/gmail?error=no_refresh_token", request.url));
  }

  await saveGoogleRefreshToken(tokens.refresh_token);

  return NextResponse.redirect(new URL("/gmail?connected=1", request.url));
}
