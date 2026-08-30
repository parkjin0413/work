import { NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/auth/requireAdmin";
import { getGoogleAuthUrl } from "@/lib/google/oauthClient";

export async function GET() {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "관리자만 접근할 수 있습니다." }, { status: 401 });
    }
    throw error;
  }

  return NextResponse.redirect(getGoogleAuthUrl());
}
