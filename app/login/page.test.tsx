import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signInWithPasswordMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: signInWithPasswordMock },
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signInWithPasswordMock.mockClear();
  });

  it("로그인 실패 시 한글 에러 메시지를 보여준다", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Invalid" } });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이메일 또는 비밀번호가 올바르지 않습니다."
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("로그인 성공 시 홈으로 이동한다", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: null });
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
  });
});
