import { Client } from "@notionhq/client";

export type NotionDatabaseSummary = {
  id: string;
  title: string;
};

export type NotionItemSummary = {
  id: string;
  title: string;
};

export type NotionDatabaseView = {
  databaseId: string;
  databaseTitle: string;
  titlePropertyName: string;
  items: NotionItemSummary[];
};

type NotionRichTextPart = { plain_text?: string };

async function collectAllResults<T>(
  fetchPage: (
    cursor: string | undefined
  ) => Promise<{ results: T[]; has_more: boolean; next_cursor: string | null }>
): Promise<T[]> {
  const allResults: T[] = [];
  let cursor: string | undefined;
  let pageCount = 0;
  const MAX_PAGES = 5;

  do {
    const response = await fetchPage(cursor);
    allResults.push(...response.results);
    cursor = response.next_cursor ?? undefined;
    pageCount += 1;
  } while (cursor && pageCount < MAX_PAGES);

  return allResults;
}

function getNotionClient(): Client | null {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Client({ auth: apiKey });
}

export function isNotionConfigured(): boolean {
  return Boolean(process.env.NOTION_API_KEY);
}

function joinRichText(richText: NotionRichTextPart[] | undefined): string {
  return richText?.map((part) => part.plain_text ?? "").join("") || "(제목 없음)";
}

function findTitlePropertyName(properties: Record<string, { type?: string }>): string {
  const entry = Object.entries(properties).find(([, value]) => value.type === "title");
  return entry ? entry[0] : "Name";
}

function extractErrorStatus(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : 0;
}

export async function listSharedDatabases(): Promise<NotionDatabaseSummary[]> {
  const notion = getNotionClient();
  if (!notion) {
    return [];
  }

  const results = await collectAllResults((start_cursor) =>
    notion.search({
      filter: { property: "object", value: "database" },
      start_cursor,
      page_size: 100,
    })
  );

  return results.map((result) => {
    const database = result as unknown as {
      id: string;
      title?: NotionRichTextPart[];
    };
    return {
      id: database.id,
      title: joinRichText(database.title),
    };
  });
}

export async function getDatabaseItems(databaseId: string): Promise<NotionDatabaseView | null> {
  const notion = getNotionClient();
  if (!notion) {
    return null;
  }

  try {
    const database = await notion.databases.retrieve({ database_id: databaseId });
    const databaseData = database as unknown as {
      title?: NotionRichTextPart[];
      properties: Record<string, { type?: string }>;
    };
    const titlePropertyName = findTitlePropertyName(databaseData.properties);

    const queryResults = await collectAllResults((start_cursor) =>
      notion.databases.query({ database_id: databaseId, start_cursor, page_size: 100 })
    );

    const items: NotionItemSummary[] = queryResults.map((page) => {
      const pageData = page as unknown as {
        id: string;
        properties: Record<string, { title?: NotionRichTextPart[] }>;
      };
      const titleProperty = pageData.properties[titlePropertyName];
      return {
        id: pageData.id,
        title: joinRichText(titleProperty?.title),
      };
    });

    return {
      databaseId,
      databaseTitle: joinRichText(databaseData.title),
      titlePropertyName,
      items,
    };
  } catch (error) {
    if (extractErrorStatus(error) === 404) {
      return null;
    }
    throw error;
  }
}

export async function createItem(params: {
  databaseId: string;
  titlePropertyName: string;
  title: string;
}): Promise<void> {
  const notion = getNotionClient();
  if (!notion) {
    throw new Error("Notion이 연동되어 있지 않습니다.");
  }

  await notion.pages.create({
    parent: { database_id: params.databaseId },
    properties: {
      [params.titlePropertyName]: {
        title: [{ text: { content: params.title } }],
      },
    },
  });
}

export async function renameItem(params: {
  pageId: string;
  titlePropertyName: string;
  newTitle: string;
}): Promise<void> {
  const notion = getNotionClient();
  if (!notion) {
    throw new Error("Notion이 연동되어 있지 않습니다.");
  }

  await notion.pages.update({
    page_id: params.pageId,
    properties: {
      [params.titlePropertyName]: {
        title: [{ text: { content: params.newTitle } }],
      },
    },
  });
}
