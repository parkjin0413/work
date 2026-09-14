import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { resolveRedirect } from "./resolveRedirect";

describe("resolveRedirect", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("로그인하지 않은 사용자가 보호된 경로에 접근하면 /login으로 보낸다", () => {
    expect(resolveRedirect("/", null)).toBe("/login");
  });

  it("관리자가 아닌 사용자가 보호된 경로에 접근하면 /login으로 보낸다", () => {
    expect(resolveRedirect("/tasks", { email: "someone@else.com" })).toBe("/login");
  });

  it("관리자가 보호된 경로에 접근하면 리다이렉트하지 않는다", () => {
    expect(resolveRedirect("/tasks", { email: "admin@example.com" })).toBeNull();
  });

  it("이미 로그인한 관리자가 /login에 접근하면 업무관리로 보낸다", () => {
    expect(resolveRedirect("/login", { email: "admin@example.com" })).toBe("/tasks");
  });

  it("로그인하지 않은 사용자가 /login에 접근하면 리다이렉트하지 않는다", () => {
    expect(resolveRedirect("/login", null)).toBeNull();
  });
});
