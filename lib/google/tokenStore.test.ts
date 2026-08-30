import { describe, it, expect, vi, beforeEach } from "vitest";
import { saveGoogleRefreshToken, getGoogleRefreshToken } from "./tokenStore";

const upsertMock = vi.fn();
const maybeSingleMock = vi.fn();
const eqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn(() => ({ upsert: upsertMock, select: selectMock }));

vi.mock("@/lib/supabase/serviceClient", () => ({
  createSupabaseServiceClient: () => ({ from: fromMock }),
}));

vi.mock("@/lib/crypto/tokenCipher", () => ({
  encryptToken: (value: string) => `encrypted:${value}`,
  decryptToken: (value: string) => value.replace("encrypted:", ""),
}));

describe("tokenStore", () => {
  beforeEach(() => {
    upsertMock.mockReset();
    maybeSingleMock.mockReset();
    eqMock.mockClear();
    selectMock.mockClear();
    fromMock.mockClear();
  });

  it("saveGoogleRefreshToken은 암호화한 값을 oauth_tokens 테이블에 upsert한다", async () => {
    upsertMock.mockResolvedValue({ error: null });

    await saveGoogleRefreshToken("raw-refresh-token");

    expect(fromMock).toHaveBeenCalledWith("oauth_tokens");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        encrypted_refresh_token: "encrypted:raw-refresh-token",
      })
    );
  });

  it("upsert가 실패하면 에러를 던진다", async () => {
    upsertMock.mockResolvedValue({ error: { message: "db down" } });

    await expect(saveGoogleRefreshToken("raw-refresh-token")).rejects.toThrow("db down");
  });

  it("getGoogleRefreshToken은 저장된 토큰을 복호화해서 반환한다", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { encrypted_refresh_token: "encrypted:raw-refresh-token" },
      error: null,
    });

    const result = await getGoogleRefreshToken();

    expect(eqMock).toHaveBeenCalledWith("provider", "google");
    expect(result).toBe("raw-refresh-token");
  });

  it("저장된 토큰이 없으면 null을 반환한다", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await getGoogleRefreshToken();

    expect(result).toBeNull();
  });
});
