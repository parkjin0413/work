import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getGoogleAuthUrl, GOOGLE_SCOPES } from "./oauthClient";

describe("getGoogleAuthUrl", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = "test-client-id";
    process.env.GOOGLE_CLIENT_SECRET = "test-client-secret";
    process.env.GOOGLE_REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("Gmail과 Drive 스코프를 모두 포함한 인증 URL을 생성한다", () => {
    const url = getGoogleAuthUrl();
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    const scopeParam = parsed.searchParams.get("scope") ?? "";
    for (const scope of GOOGLE_SCOPES) {
      expect(scopeParam).toContain(scope);
    }
  });

  it("access_type=offline과 prompt=consent를 요청해 refresh token을 받도록 한다", () => {
    const url = getGoogleAuthUrl();
    const parsed = new URL(url);

    expect(parsed.searchParams.get("access_type")).toBe("offline");
    expect(parsed.searchParams.get("prompt")).toBe("consent");
  });
});
