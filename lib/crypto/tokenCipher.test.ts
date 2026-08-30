import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptToken, decryptToken } from "./tokenCipher";

describe("tokenCipher", () => {
  const originalKey = process.env.TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = "a".repeat(64);
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = originalKey;
  });

  it("암호화한 값을 복호화하면 원래 문자열로 돌아온다", () => {
    const original = "test-refresh-token-value";
    const encrypted = encryptToken(original);
    expect(decryptToken(encrypted)).toBe(original);
  });

  it("같은 값을 두 번 암호화하면 서로 다른 암호문이 나온다 (매번 다른 IV)", () => {
    const a = encryptToken("same-value");
    const b = encryptToken("same-value");
    expect(a).not.toBe(b);
  });

  it("암호문이 변조되면 복호화 시 에러를 던진다", () => {
    const encrypted = encryptToken("tamper-test");
    const [iv, authTag, data] = encrypted.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "00"].join(":");
    expect(() => decryptToken(tampered)).toThrow();
  });

  it("TOKEN_ENCRYPTION_KEY가 없으면 에러를 던진다", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("value")).toThrow();
  });
});
