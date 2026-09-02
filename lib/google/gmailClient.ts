import { google, gmail_v1 } from "googleapis";
import { createGoogleOAuthClient } from "@/lib/google/oauthClient";
import { getGoogleRefreshToken } from "@/lib/google/tokenStore";

export type GmailMessageSummary = {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type GmailMessageDetail = GmailMessageSummary & {
  body: string;
};

async function getGmailClient(): Promise<gmail_v1.Gmail | null> {
  const refreshToken = await getGoogleRefreshToken();
  if (!refreshToken) {
    return null;
  }

  const auth = createGoogleOAuthClient();
  auth.setCredentials({ refresh_token: refreshToken });

  return google.gmail({ version: "v1", auth });
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string): string {
  const header = headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? "";
}

function extractPlainTextBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf8");
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const text = extractPlainTextBody(part);
      if (text) {
        return text;
      }
    }
  }

  return "";
}

export async function listRecentMessages(
  maxResults = 20,
  labelIds?: string[]
): Promise<GmailMessageSummary[]> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return [];
  }

  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    ...(labelIds ? { labelIds } : {}),
  });

  const messageIds = listResponse.data.messages ?? [];

  const messages = await Promise.all(
    messageIds.map(async (message) => {
      const detail = await gmail.users.messages.get({
        userId: "me",
        id: message.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      return {
        id: detail.data.id!,
        subject: getHeader(detail.data.payload?.headers, "Subject") || "(제목 없음)",
        from: getHeader(detail.data.payload?.headers, "From"),
        date: getHeader(detail.data.payload?.headers, "Date"),
        snippet: detail.data.snippet ?? "",
      };
    })
  );

  return messages;
}

export async function getMessageDetail(id: string): Promise<GmailMessageDetail | null> {
  const gmail = await getGmailClient();
  if (!gmail) {
    return null;
  }

  let detail;
  try {
    detail = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
  } catch (error) {
    const status =
      (error as { response?: { status?: number } })?.response?.status ??
      Number((error as { code?: number | string })?.code);
    if (status === 404) {
      return null;
    }
    throw error;
  }

  return {
    id: detail.data.id!,
    subject: getHeader(detail.data.payload?.headers, "Subject") || "(제목 없음)",
    from: getHeader(detail.data.payload?.headers, "From"),
    date: getHeader(detail.data.payload?.headers, "Date"),
    snippet: detail.data.snippet ?? "",
    body: extractPlainTextBody(detail.data.payload) || detail.data.snippet || "",
  };
}

export async function sendEmail(params: { to: string; subject: string; body: string }): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  const message = [
    `To: ${params.to}`,
    `Subject: =?UTF-8?B?${Buffer.from(params.subject, "utf8").toString("base64")}?=`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    params.body,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
}

export async function trashMessage(id: string): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await gmail.users.messages.trash({ userId: "me", id });
}

export async function trashMessages(ids: string[]): Promise<void> {
  const gmail = await getGmailClient();
  if (!gmail) {
    throw new Error("Google 계정이 연결되어 있지 않습니다.");
  }

  await Promise.all(ids.map((id) => gmail.users.messages.trash({ userId: "me", id })));
}

export async function isGoogleConnected(): Promise<boolean> {
  const refreshToken = await getGoogleRefreshToken();
  return refreshToken !== null;
}
