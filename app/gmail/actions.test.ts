import { describe, it, expect, vi, beforeEach } from "vitest";

const { requireAdminMock, trashMessagesMock, revalidatePathMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  trashMessagesMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/auth/requireAdmin", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/google/gmailClient", () => ({
  trashMessages: trashMessagesMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

import { trashMessagesAction } from "./actions";

describe("trashMessagesAction", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    trashMessagesMock.mockReset();
    revalidatePathMock.mockReset();
    requireAdminMock.mockResolvedValue({ email: "admin@example.com" });
  });

  it("requireAdmin을 호출한다", async () => {
    trashMessagesMock.mockResolvedValue(undefined);

    await trashMessagesAction(["msg-1"]);

    expect(requireAdminMock).toHaveBeenCalled();
  });

  it("requireAdmin이 실패하면 trashMessages를 호출하지 않는다", async () => {
    requireAdminMock.mockRejectedValue(new Error("unauthorized"));

    await expect(trashMessagesAction(["msg-1"])).rejects.toThrow();
    expect(trashMessagesMock).not.toHaveBeenCalled();
  });

  it("정상 삭제는 trashMessages와 revalidatePath를 호출한다", async () => {
    trashMessagesMock.mockResolvedValue(undefined);

    await trashMessagesAction(["msg-1", "msg-2"]);

    expect(trashMessagesMock).toHaveBeenCalledWith(["msg-1", "msg-2"]);
    expect(revalidatePathMock).toHaveBeenCalledWith("/gmail");
  });
});
