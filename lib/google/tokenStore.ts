import { createSupabaseServiceClient } from "@/lib/supabase/serviceClient";
import { encryptToken, decryptToken } from "@/lib/crypto/tokenCipher";

const PROVIDER = "google";

export async function saveGoogleRefreshToken(refreshToken: string): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const encrypted = encryptToken(refreshToken);

  const { error } = await supabase.from("oauth_tokens").upsert({
    provider: PROVIDER,
    encrypted_refresh_token: encrypted,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Google refresh token 저장 실패: ${error.message}`);
  }
}

export async function getGoogleRefreshToken(): Promise<string | null> {
  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("oauth_tokens")
    .select("encrypted_refresh_token")
    .eq("provider", PROVIDER)
    .maybeSingle();

  if (error) {
    throw new Error(`Google refresh token 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return decryptToken(data.encrypted_refresh_token);
}
