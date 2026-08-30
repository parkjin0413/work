import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { AppHeader } from "./AppHeader";

const pushMock = vi.fn();
const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
}));

const signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: signOutMock },
  }),
}));

function renderHeader() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppHeader />
    </ThemeProvider>
  );
}

describe("AppHeader", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signOutMock.mockClear();
    signOutMock.mockResolvedValue({ error: null });
  });

  it("대시보드 제목을 한글로 보여준다", () => {
    renderHeader();
    expect(screen.getByText("개인 업무 대시보드")).toBeInTheDocument();
  });

  it("로그아웃 버튼을 누르면 로그아웃 후 로그인 화면으로 이동한다", async () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
