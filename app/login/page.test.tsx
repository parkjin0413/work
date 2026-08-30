import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "./page";

const pushMock = vi.fn();
const refreshMock = vi.fn();

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  useSearchParams: () => searchParams,
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
    signInWithPasswordMock.mockReset();
    searchParams = new URLSearchParams();
  });

  function submitLoginForm() {
    fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "some-password" } });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  }

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

  it("이메일 미인증 계정이면 인증 안내 메시지를 보여준다", async () => {
    signInWithPasswordMock.mockResolvedValue({ error: { message: "Email not confirmed" } });
    render(<LoginPage />);

    submitLoginForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "이메일이 아직 인증되지 않았습니다. 이메일함을 확인해주세요."
    );
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("네트워크 오류가 발생하면 일반 오류 메시지를 보여주고 버튼을 다시 활성화한다", async () => {
    signInWithPasswordMock.mockRejectedValue(new Error("network down"));
    render(<LoginPage />);

    submitLoginForm();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    );
    expect(screen.getByRole("button", { name: "로그인" })).toBeEnabled();
  });

  it("관리자 권한이 없어 리다이렉트된 경우 안내 메시지를 바로 보여준다", () => {
    searchParams = new URLSearchParams("error=not_admin");
    render(<LoginPage />);

    expect(screen.getByRole("alert")).toHaveTextContent("관리자 권한이 없는 계정입니다.");
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });
});
