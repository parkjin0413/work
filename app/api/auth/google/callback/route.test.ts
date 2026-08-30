// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { UnauthorizedError } from "@/lib/auth/requireAdmin";

const { requireAdminMock, createGoogleOAuthClientMock, saveGoogleRefreshTokenMock } = vi.hoisted(
  () => ({
    requireAdminMock: vi.fn(),
    createGoogleOAuthClientMock: vi.fn(),
    saveGoogleRefreshTokenMock: vi.fn(),
  })
);

vi.mock("@/lib/auth/requireAdmin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/requireAdmin")>(
    "@/lib/auth/requireAdmin"
  );
  return { ...actual, requireAdmin: requireAdminMock };
});

vi.mock("@/lib/google/oauthClient", () => ({
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("@/lib/google/tokenStore", () => ({
  saveGoogleRefreshToken: saveGoogleRefreshTokenMock,
}));

function makeRequest(url: string, cookies?: Record<string, string>) {
  const request = new NextRequest(new URL(url));
  if (cookies) {
    for (const [name, value] of Object.entries(cookies)) {
      request.cookies.set(name, value);
    }
  }
  return request;
}

describe("GET /api/auth/google/callback", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    createGoogleOAuthClientMock.mockReset();
    saveGoogleRefreshTokenMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("Google이 error 파라미터를 보내면 그대로 전달한다", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?error=access_denied")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=access_denied");
  });

  it("code 파라미터가 없으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    const response = await GET(makeRequest("http://localhost:3000/api/auth/google/callback"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=missing_code");
  });

  it("state가 쿠키와 일치하지 않으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/auth/google/callback?code=test-code&state=wrong-state",
        { google_oauth_state: "expected-state" }
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=invalid_state");
  });

  it("state 쿠키 자체가 없으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?code=test-code&state=some-state")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=invalid_state");
  });

  it("토큰 교환이 실패하면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockRejectedValue(new Error("invalid_grant")),
    });

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/auth/google/callback?code=test-code&state=matching-state",
        { google_oauth_state: "matching-state" }
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/gmail?error=token_exchange_failed"
    );
  });

  it("refresh_token이 없으면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockResolvedValue({ tokens: { access_token: "abc" } }),
    });

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/auth/google/callback?code=test-code&state=matching-state",
        { google_oauth_state: "matching-state" }
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/gmail?error=no_refresh_token"
    );
    expect(saveGoogleRefreshTokenMock).not.toHaveBeenCalled();
  });

  it("토큰 저장이 실패하면 에러와 함께 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockResolvedValue({ tokens: { refresh_token: "refresh-abc" } }),
    });
    saveGoogleRefreshTokenMock.mockRejectedValue(new Error("db down"));

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/auth/google/callback?code=test-code&state=matching-state",
        { google_oauth_state: "matching-state" }
      )
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?error=save_failed");
  });

  it("정상 흐름에서는 refresh token을 저장하고 /gmail로 리다이렉트한다", async () => {
    createGoogleOAuthClientMock.mockReturnValue({
      getToken: vi.fn().mockResolvedValue({ tokens: { refresh_token: "refresh-abc" } }),
    });
    saveGoogleRefreshTokenMock.mockResolvedValue(undefined);

    const response = await GET(
      makeRequest(
        "http://localhost:3000/api/auth/google/callback?code=test-code&state=matching-state",
        { google_oauth_state: "matching-state" }
      )
    );

    expect(saveGoogleRefreshTokenMock).toHaveBeenCalledWith("refresh-abc");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/gmail?connected=1");
  });

  it("관리자가 아니면 401을 반환한다", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    const response = await GET(
      makeRequest("http://localhost:3000/api/auth/google/callback?code=test-code")
    );

    expect(response.status).toBe(401);
  });
});
