import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getGoogleRefreshTokenMock,
  setCredentialsMock,
  createGoogleOAuthClientMock,
  messagesListMock,
  messagesGetMock,
  messagesSendMock,
  messagesTrashMock,
} = vi.hoisted(() => {
  const setCredentialsMock = vi.fn();
  return {
    getGoogleRefreshTokenMock: vi.fn(),
    setCredentialsMock,
    createGoogleOAuthClientMock: vi.fn(() => ({ setCredentials: setCredentialsMock })),
    messagesListMock: vi.fn(),
    messagesGetMock: vi.fn(),
    messagesSendMock: vi.fn(),
    messagesTrashMock: vi.fn(),
  };
});

vi.mock("@/lib/google/tokenStore", () => ({
  getGoogleRefreshToken: getGoogleRefreshTokenMock,
}));

vi.mock("@/lib/google/oauthClient", () => ({
  createGoogleOAuthClient: createGoogleOAuthClientMock,
}));

vi.mock("googleapis", () => ({
  google: {
    gmail: vi.fn(() => ({
      users: {
        messages: {
          list: messagesListMock,
          get: messagesGetMock,
          send: messagesSendMock,
          trash: messagesTrashMock,
        },
      },
    })),
  },
}));

import {
  listRecentMessages,
  getMessageDetail,
  sendEmail,
  trashMessage,
  trashMessages,
  isGoogleConnected,
} from "./gmailClient";

describe("gmailClient", () => {
  beforeEach(() => {
    getGoogleRefreshTokenMock.mockReset();
    setCredentialsMock.mockReset();
    createGoogleOAuthClientMock.mockClear();
    messagesListMock.mockReset();
    messagesGetMock.mockReset();
    messagesSendMock.mockReset();
    messagesTrashMock.mockReset();
  });

  it("Google 계정이 연결되어 있지 않으면 빈 목록을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await listRecentMessages();

    expect(result).toEqual([]);
    expect(messagesListMock).not.toHaveBeenCalled();
  });

  it("최근 메시지 목록을 제목/보낸사람/날짜/미리보기와 함께 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesListMock.mockResolvedValue({ data: { messages: [{ id: "msg-1" }] } });
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기 내용",
        payload: {
          headers: [
            { name: "Subject", value: "테스트 제목" },
            { name: "From", value: "sender@example.com" },
            { name: "Date", value: "2026-08-30" },
          ],
        },
      },
    });

    const result = await listRecentMessages(10);

    expect(messagesListMock).toHaveBeenCalledWith({ userId: "me", maxResults: 10 });
    expect(setCredentialsMock).toHaveBeenCalledWith({ refresh_token: "refresh-token" });
    expect(result).toEqual([
      {
        id: "msg-1",
        subject: "테스트 제목",
        from: "sender@example.com",
        date: "2026-08-30",
        snippet: "미리보기 내용",
      },
    ]);
  });

  it("labelIds를 지정하면 API 호출에 포함한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesListMock.mockResolvedValue({ data: { messages: [] } });

    await listRecentMessages(20, ["SENT"]);

    expect(messagesListMock).toHaveBeenCalledWith({
      userId: "me",
      maxResults: 20,
      labelIds: ["SENT"],
    });
  });

  it("Google 계정이 연결되어 있지 않으면 상세 조회는 null을 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    const result = await getMessageDetail("msg-1");

    expect(result).toBeNull();
  });

  it("상세 조회는 text/plain 본문을 디코딩해서 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    const bodyText = "안녕하세요, 본문입니다.";
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기",
        payload: {
          headers: [{ name: "Subject", value: "제목" }],
          mimeType: "text/plain",
          body: { data: Buffer.from(bodyText, "utf8").toString("base64") },
        },
      },
    });

    const result = await getMessageDetail("msg-1");

    expect(result?.body).toBe(bodyText);
  });

  it("HTML 전용 메시지는 본문에 HTML을 절대 반환하지 않는다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockResolvedValue({
      data: {
        id: "msg-1",
        snippet: "미리보기 텍스트",
        payload: {
          headers: [{ name: "Subject", value: "제목" }],
          mimeType: "text/html",
          body: { data: Buffer.from("<script>alert(1)</script>", "utf8").toString("base64") },
        },
      },
    });

    const result = await getMessageDetail("msg-1");

    expect(result?.body).not.toContain("<script>");
    expect(result?.body).not.toContain("<");
    expect(result?.body).toBe("미리보기 텍스트");
  });

  it("존재하지 않는 메시지 ID는 null을 반환한다 (404)", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockRejectedValue({ response: { status: 404 } });

    const result = await getMessageDetail("missing-id");

    expect(result).toBeNull();
  });

  it("404가 아닌 에러는 그대로 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesGetMock.mockRejectedValue({ response: { status: 401 } });

    await expect(getMessageDetail("some-id")).rejects.toBeTruthy();
  });

  it("Google 계정이 연결되어 있지 않으면 발송 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(sendEmail({ to: "a@example.com", subject: "s", body: "b" })).rejects.toThrow();
  });

  it("발송은 Base64URL로 인코딩한 raw 메시지를 전송한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesSendMock.mockResolvedValue({});

    await sendEmail({ to: "a@example.com", subject: "제목", body: "본문" });

    expect(messagesSendMock).toHaveBeenCalledWith({
      userId: "me",
      requestBody: { raw: expect.any(String) },
    });
    const raw = messagesSendMock.mock.calls[0][0].requestBody.raw as string;
    expect(raw).not.toContain("+");
    expect(raw).not.toContain("/");
  });

  it("삭제는 트래시로 이동시킨다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock.mockResolvedValue({});

    await trashMessage("msg-1");

    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-1" });
  });

  it("Google 계정이 연결되어 있지 않으면 일괄 삭제 시 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue(null);

    await expect(trashMessages(["msg-1"])).rejects.toThrow();
    expect(messagesTrashMock).not.toHaveBeenCalled();
  });

  it("일괄 삭제는 각 ID에 대해 trash를 호출한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock.mockResolvedValue({});

    await trashMessages(["msg-1", "msg-2", "msg-3"]);

    expect(messagesTrashMock).toHaveBeenCalledTimes(3);
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-1" });
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-2" });
    expect(messagesTrashMock).toHaveBeenCalledWith({ userId: "me", id: "msg-3" });
  });

  it("일괄 삭제 중 하나라도 실패하면 에러를 던진다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("refresh-token");
    messagesTrashMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("삭제 실패"));

    await expect(trashMessages(["msg-1", "msg-2"])).rejects.toThrow();
  });

  it("isGoogleConnected은 refresh token 존재 여부를 반환한다", async () => {
    getGoogleRefreshTokenMock.mockResolvedValue("token");
    expect(await isGoogleConnected()).toBe(true);

    getGoogleRefreshTokenMock.mockResolvedValue(null);
    expect(await isGoogleConnected()).toBe(false);
  });
});
