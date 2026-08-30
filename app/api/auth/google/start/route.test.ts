// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { UnauthorizedError } from "@/lib/auth/requireAdmin";

const { requireAdminMock, getGoogleAuthUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getGoogleAuthUrlMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/requireAdmin")>(
    "@/lib/auth/requireAdmin"
  );
  return { ...actual, requireAdmin: requireAdminMock };
});

vi.mock("@/lib/google/oauthClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/google/oauthClient")>(
    "@/lib/google/oauthClient"
  );
  return { ...actual, getGoogleAuthUrl: getGoogleAuthUrlMock };
});

describe("GET /api/auth/google/start", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getGoogleAuthUrlMock.mockReset();
  });

  it("관리자가 아니면 401을 반환한다", async () => {
    requireAdminMock.mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
  });

  it("관리자면 Google 인증 URL로 리다이렉트한다", async () => {
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
    getGoogleAuthUrlMock.mockReturnValue("https://accounts.google.com/o/oauth2/v2/auth?mock=1");

    const response = await GET();

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://accounts.google.com/o/oauth2/v2/auth?mock=1"
    );
    expect(getGoogleAuthUrlMock).toHaveBeenCalledWith(expect.any(String));
    expect(response.headers.get("set-cookie")).toContain("google_oauth_state");
  });
});
