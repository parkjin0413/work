import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isAdminUser } from "./isAdminUser";

describe("isAdminUser", () => {
  const originalEnv = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "admin@example.com";
  });

  afterEach(() => {
    process.env.ADMIN_EMAIL = originalEnv;
  });

  it("관리자 이메일과 대소문자 무관하게 일치하면 true를 반환한다", () => {
    expect(isAdminUser("Admin@Example.com")).toBe(true);
  });

  it("관리자 이메일과 다르면 false를 반환한다", () => {
    expect(isAdminUser("someone@else.com")).toBe(false);
  });

  it("이메일이 null 또는 undefined면 false를 반환한다", () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it("ADMIN_EMAIL 환경변수가 없으면 false를 반환한다", () => {
    delete process.env.ADMIN_EMAIL;
    expect(isAdminUser("admin@example.com")).toBe(false);
  });
});
