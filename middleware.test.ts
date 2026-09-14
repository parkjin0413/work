// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

type TestCookie = { name: string; value: string; options: CookieOptions };

const state = vi.hoisted(() => ({
  user: null as { email: string } | null,
  cookiesToSet: [] as { name: string; value: string; options: Record<string, unknown> }[],
  signOut: vi.fn(),
}));

// @supabase/ssr 대신, 미들웨어가 넘긴 cookies.setAll 콜백을 테스트가 직접 호출해
// 실제 라이브러리가 세션을 갱신할 때 하는 동작을 재현한다.
vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: { cookies: { getAll: () => unknown; setAll: (cookies: TestCookie[]) => void } }
  ) => ({
    auth: {
      getUser: async () => {
        if (state.cookiesToSet.length > 0) {
          options.cookies.setAll(state.cookiesToSet as TestCookie[]);
        }
        return { data: { user: state.user } };
      },
      signOut: state.signOut,
    },
  }),
}));

import { middleware } from "./middleware";

function requestFor(pathname: string) {
  return new NextRequest(new URL(`http://localhost:3000${pathname}`));
}

describe("middleware", () => {
  const originalAdminEmail = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    state.user = null;
    state.cookiesToSet = [];
    state.signOut.mockReset();
    state.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalAdminEmail;
  });

  it("여러 개의 쿠키가 한 번에 설정돼도 모두 응답에 남는다", async () => {
    state.user = { email: "admin@example.com" };
    state.cookiesToSet = [
      { name: "sb-access-token", value: "access-1", options: { path: "/", httpOnly: true } },
      { name: "sb-refresh-token", value: "refresh-1", options: { path: "/", maxAge: 3600 } },
    ];

    const response = await middleware(requestFor("/"));
    const cookies = response.cookies.getAll();

    const accessToken = cookies.find((cookie) => cookie.name === "sb-access-token");
    const refreshToken = cookies.find((cookie) => cookie.name === "sb-refresh-token");

    expect(accessToken).toMatchObject({ value: "access-1", path: "/", httpOnly: true });
    expect(refreshToken).toMatchObject({ value: "refresh-1", path: "/", maxAge: 3600 });
  });

  it("리다이렉트 응답에도 갱신된 쿠키가 그대로 실려 나간다", async () => {
    state.user = null;
    state.cookiesToSet = [
      { name: "sb-access-token", value: "access-2", options: { path: "/", httpOnly: true } },
    ];

    const response = await middleware(requestFor("/tasks"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login");
    expect(response.cookies.get("sb-access-token")).toMatchObject({
      value: "access-2",
      httpOnly: true,
    });
  });

  it("로그인한 관리자가 /login에 접근하면 업무관리로 리다이렉트한다", async () => {
    state.user = { email: "admin@example.com" };

    const response = await middleware(requestFor("/login"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/tasks");
  });

  it("로그인한 관리자가 홈에 접근하면 리다이렉트하지 않는다", async () => {
    state.user = { email: "admin@example.com" };

    const response = await middleware(requestFor("/"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("관리자가 아닌 로그인 사용자는 로그아웃 후 사유와 함께 로그인 화면으로 보낸다", async () => {
    state.user = { email: "someone@else.com" };

    const response = await middleware(requestFor("/tasks"));

    expect(state.signOut).toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=not_admin");
  });
});
