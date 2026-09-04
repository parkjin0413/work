import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
  reorderAccountsAction: vi.fn(),
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
    accounts: [],
  },
];

describe("AccountsBoard", () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("카테고리별로 섹션을 나눠서 계정 카드를 보여준다", () => {
    render(<AccountsBoard categories={categories} />);

    expect(screen.getByRole("heading", { name: "업무" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "개인" })).toBeInTheDocument();
    expect(screen.getByText("사내 관리자")).toBeInTheDocument();
  });

  it("계정이 없는 카테고리 섹션은 안내 문구를 보여준다", () => {
    render(<AccountsBoard categories={categories} />);

    expect(screen.getByText("등록된 계정이 없습니다.")).toBeInTheDocument();
  });

  it("카테고리를 가로지르는 체크박스 필터는 더 이상 없다", () => {
    render(<AccountsBoard categories={categories} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("각 카드에 순서 변경용 드래그 핸들이 있다", () => {
    render(<AccountsBoard categories={categories} />);

    expect(screen.getByRole("button", { name: "사내 관리자 순서 변경" })).toBeInTheDocument();
  });
});
