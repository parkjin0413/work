import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AccountCard } from "./AccountCard";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { renameAccountActionMock, deleteAccountActionMock } = vi.hoisted(() => ({
  renameAccountActionMock: vi.fn(),
  deleteAccountActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  renameAccountAction: renameAccountActionMock,
  deleteAccountAction: deleteAccountActionMock,
}));

const writeTextMock = vi.fn();

const account = {
  id: "acc-1",
  name: "사내 관리자",
  url: "https://admin.example.com",
  username: "admin",
  password: "secret1",
  memo: "메모",
};

const categories = [
  { id: "cat-1", name: "업무" },
  { id: "cat-2", name: "개인" },
];

function renderCard() {
  return render(
    <AccountCard account={account} categoryId="cat-1" categoryName="업무" categories={categories} />
  );
}

describe("AccountCard", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    renameAccountActionMock.mockReset();
    deleteAccountActionMock.mockReset();
    writeTextMock.mockReset().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("아이디를 클릭하면 클립보드에 복사된다", async () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "admin" }));

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith("admin"));
    expect(await screen.findAllByText("복사되었습니다")).toHaveLength(1);
  });

  it("비밀번호는 기본적으로 마스킹되어 있다", () => {
    renderCard();

    expect(screen.queryByRole("button", { name: "secret1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "•".repeat(10) })).toBeInTheDocument();
  });

  it("비밀번호를 클릭하면 복사되고 잠깐 노출된 뒤 다시 마스킹된다", async () => {
    vi.useFakeTimers();
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "•".repeat(10) }));
    expect(screen.getByRole("button", { name: "secret1" })).toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(writeTextMock).toHaveBeenCalledWith("secret1");

    await act(() => vi.advanceTimersByTimeAsync(1500));
    expect(screen.getByRole("button", { name: "•".repeat(10) })).toBeInTheDocument();
  });

  it("보기 아이콘을 누르면 계속 노출되고 다시 누르면 마스킹된다", () => {
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 보기" }));
    expect(screen.getByRole("button", { name: "secret1" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "비밀번호 숨기기" }));
    expect(screen.getByRole("button", { name: "•".repeat(10) })).toBeInTheDocument();
  });

  it("수정 버튼을 누르면 편집 폼이 나오고 저장하면 renameAccountAction을 호출한다", async () => {
    renameAccountActionMock.mockResolvedValue(undefined);
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "사내 관리자 수정" }));
    fireEvent.change(screen.getByLabelText("계정명"), { target: { value: "새 이름" } });
    fireEvent.click(screen.getByRole("button", { name: "저장" }));

    await waitFor(() =>
      expect(renameAccountActionMock).toHaveBeenCalledWith({
        id: "acc-1",
        categoryId: "cat-1",
        name: "새 이름",
        url: "https://admin.example.com",
        username: "admin",
        password: "secret1",
        memo: "메모",
      })
    );
    expect(refreshMock).toHaveBeenCalled();
  });

  it("삭제 버튼을 누르면 deleteAccountAction을 호출한다", async () => {
    deleteAccountActionMock.mockResolvedValue(undefined);
    renderCard();

    fireEvent.click(screen.getByRole("button", { name: "사내 관리자 삭제" }));

    await waitFor(() => expect(deleteAccountActionMock).toHaveBeenCalledWith("acc-1"));
    expect(refreshMock).toHaveBeenCalled();
  });
});
