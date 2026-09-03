import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AccountsBoard } from "./AccountsBoard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("./actions", () => ({
  createCategoryAction: vi.fn(),
  renameCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
  createAccountAction: vi.fn(),
  renameAccountAction: vi.fn(),
  deleteAccountAction: vi.fn(),
}));

const categories = [
  {
    id: "cat-1",
    name: "업무",
    accounts: [
      {
        id: "acc-1",
        name: "사내 관리자",
        url: "https://admin.example.com",
        username: "admin",
        password: "secret1",
        memo: null,
      },
    ],
  },
  {
    id: "cat-2",
    name: "개인",
    accounts: [
      {
        id: "acc-2",
        name: "개인 메일",
        url: "https://mail.example.com",
        username: "me",
        password: "secret2",
        memo: null,
      },
    ],
  },
];

describe("AccountsBoard", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("기본적으로 모든 카테고리의 계정 카드를 보여준다", () => {
    render(<AccountsBoard categories={categories} />);

    expect(screen.getByText("사내 관리자")).toBeInTheDocument();
    expect(screen.getByText("개인 메일")).toBeInTheDocument();
  });

  it("카테고리 체크박스를 해제하면 해당 카테고리의 카드가 사라진다", () => {
    render(<AccountsBoard categories={categories} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "개인" }));

    expect(screen.getByText("사내 관리자")).toBeInTheDocument();
    expect(screen.queryByText("개인 메일")).not.toBeInTheDocument();
  });

  it("전체 체크박스를 해제하면 모든 카드가 사라진다", () => {
    render(<AccountsBoard categories={categories} />);

    fireEvent.click(screen.getByRole("checkbox", { name: "전체" }));

    expect(screen.getByText("표시할 계정이 없습니다.")).toBeInTheDocument();
  });
});
