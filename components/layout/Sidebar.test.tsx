import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { Sidebar } from "./Sidebar";

const pushMock = vi.fn();
const refreshMock = vi.fn();
const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: refreshMock }),
  usePathname: usePathnameMock,
}));

const signOutMock = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { signOut: signOutMock },
  }),
}));

function renderSidebar() {
  return render(<Sidebar />);
}

describe("Sidebar", () => {
  beforeEach(() => {
    pushMock.mockClear();
    refreshMock.mockClear();
    signOutMock.mockClear();
    signOutMock.mockResolvedValue({ error: null });
    usePathnameMock.mockReturnValue("/tasks");
  });

  it("대시보드 제목을 한글로 보여준다", () => {
    renderSidebar();
    expect(screen.getByText("강산이엔지 업무 대시보드")).toBeInTheDocument();
  });

  it("7개의 메뉴 링크를 업무·일정·양식·어카운트·회사·웹·제품 순서로 보여준다 (별도 홈 없음)", () => {
    renderSidebar();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "업무",
      "일정",
      "양식",
      "어카운트",
      "회사",
      "웹",
      "제품",
    ]);
    expect(screen.getByRole("link", { name: "웹" })).toHaveAttribute("href", "/hosting");
    expect(screen.getByRole("link", { name: "일정" })).toHaveAttribute("href", "/calendar");
    expect(screen.getByRole("link", { name: "업무" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "양식" })).toHaveAttribute("href", "/forms");
    expect(screen.getByRole("link", { name: "어카운트" })).toHaveAttribute("href", "/sites");
    expect(screen.queryByRole("link", { name: "계정관리" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "즐겨찾기" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "제품" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "회사" })).toHaveAttribute("href", "/company");
    expect(screen.queryByRole("link", { name: "홈" })).not.toBeInTheDocument();
  });

  it("현재 경로의 메뉴 항목에 aria-current를 표시한다", () => {
    usePathnameMock.mockReturnValue("/tasks");
    renderSidebar();

    expect(screen.getByRole("link", { name: "업무" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "어카운트" })).not.toHaveAttribute("aria-current");
  });

  it("로그아웃 버튼을 누르면 로그아웃 후 로그인 화면으로 이동한다", async () => {
    renderSidebar();
    fireEvent.click(screen.getByRole("button", { name: /로그아웃/ }));

    await waitFor(() => expect(signOutMock).toHaveBeenCalled());
    expect(pushMock).toHaveBeenCalledWith("/login");
  });
});
