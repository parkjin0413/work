import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TrashButton } from "./TrashButton";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const { trashMessageActionMock } = vi.hoisted(() => ({
  trashMessageActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  trashMessageAction: trashMessageActionMock,
}));

describe("TrashButton", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    trashMessageActionMock.mockReset();
  });

  it("클릭하면 삭제 액션을 호출하고 목록으로 이동한다", async () => {
    trashMessageActionMock.mockResolvedValue(undefined);

    render(<TrashButton messageId="msg-1" />);
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() => expect(trashMessageActionMock).toHaveBeenCalledWith("msg-1"));
    expect(pushMock).toHaveBeenCalledWith("/gmail");
  });
});
