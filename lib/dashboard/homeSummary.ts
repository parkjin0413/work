import { isGoogleConnected as isGmailConnected, listRecentMessages } from "@/lib/google/gmailClient";
import { isGoogleConnected as isDriveConnected, listFolder } from "@/lib/google/driveClient";
import { isNotionConfigured, listSharedDatabases } from "@/lib/notion/notionClient";

const SUMMARY_ITEM_LIMIT = 3;

export type GmailSummary =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; subjects: string[] };

export type DriveSummary =
  | { state: "not_connected" }
  | { state: "error" }
  | { state: "ok"; names: string[] };

export type NotionSummary =
  | { state: "not_configured" }
  | { state: "empty" }
  | { state: "error" }
  | { state: "ok"; titles: string[] };

export async function getGmailSummary(): Promise<GmailSummary> {
  try {
    const connected = await isGmailConnected();
    if (!connected) {
      return { state: "not_connected" };
    }

    const messages = await listRecentMessages(SUMMARY_ITEM_LIMIT);
    return { state: "ok", subjects: messages.map((message) => message.subject) };
  } catch {
    return { state: "error" };
  }
}

export async function getDriveSummary(): Promise<DriveSummary> {
  try {
    const connected = await isDriveConnected();
    if (!connected) {
      return { state: "not_connected" };
    }

    const view = await listFolder();
    const recentFiles = (view?.files ?? [])
      .filter((file) => !file.isFolder)
      .sort((a, b) => (b.modifiedTime ?? "").localeCompare(a.modifiedTime ?? ""));
    const names = recentFiles.slice(0, SUMMARY_ITEM_LIMIT).map((file) => file.name);
    return { state: "ok", names };
  } catch {
    return { state: "error" };
  }
}

export async function getNotionSummary(): Promise<NotionSummary> {
  try {
    const configured = isNotionConfigured();
    if (!configured) {
      return { state: "not_configured" };
    }

    const databases = await listSharedDatabases();
    if (databases.length === 0) {
      return { state: "empty" };
    }
    return {
      state: "ok",
      titles: databases.slice(0, SUMMARY_ITEM_LIMIT).map((database) => database.title),
    };
  } catch {
    return { state: "error" };
  }
}
