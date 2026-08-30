import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import ComposePage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: { signOut: vi.fn() } }),
}));

const { sendEmailActionMock } = vi.hoisted(() => ({
  sendEmailActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  sendEmailAction: sendEmailActionMock,
}));

function renderComposePage() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ComposePage />
    </ThemeProvider>
  );
}

describe("ComposePage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    sendEmailActionMock.mockReset();
  });

  it("발송에 성공하면 목록으로 이동한다", async () => {
    sendEmailActionMock.mockResolvedValue(undefined);

    renderComposePage();

    fireEvent.change(screen.getByLabelText("받는 사람"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "제목" } });
    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } });
    fireEvent.click(screen.getByRole("button", { name: "발송" }));

    await waitFor(() =>
      expect(sendEmailActionMock).toHaveBeenCalledWith({
        to: "a@example.com",
        subject: "제목",
        body: "본문",
      })
    );
    expect(pushMock).toHaveBeenCalledWith("/gmail");
  });

  it("발송에 실패하면 한글 에러 메시지를 보여준다", async () => {
    sendEmailActionMock.mockRejectedValue(new Error("send failed"));

    renderComposePage();

    fireEvent.change(screen.getByLabelText("받는 사람"), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("제목"), { target: { value: "제목" } });
    fireEvent.change(screen.getByLabelText("내용"), { target: { value: "본문" } });
    fireEvent.click(screen.getByRole("button", { name: "발송" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
  });
});
