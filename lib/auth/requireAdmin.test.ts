import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireAdmin, UnauthorizedError } from "./requireAdmin";

const getUserMock = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: getUserMock },
  }),
}));

describe("requireAdmin", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    getUserMock.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("관리자 계정이면 이메일을 반환한다", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "admin@example.com" } } });

    await expect(requireAdmin()).resolves.toEqual({ email: "admin@example.com" });
  });

  it("관리자가 아닌 계정이면 UnauthorizedError를 던진다", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "someone@else.com" } } });

    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it("로그인한 사용자가 없으면 UnauthorizedError를 던진다", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    await expect(requireAdmin()).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
