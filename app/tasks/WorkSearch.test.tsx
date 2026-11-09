import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { searchMock } = vi.hoisted(() => ({ searchMock: vi.fn() }));
vi.mock("./workItemActions", () => ({ searchWorkItemsAction: searchMock }));

import { WorkSearch } from "./WorkSearch";

describe("WorkSearch", () => {
  beforeEach(() => searchMock.mockReset());

  it("두 글자 이상이면 검색하고, 결과를 누르면 그 주로 이동하는 링크를 보여준다", async () => {
    searchMock.mockResolvedValue([
      {
        id: "1",
        date: "2025-11-05",
        body: "나스 계정 패스워드 변경",
        status: "done",
        projectId: null,
        projectName: "나스 관리",
        scheduleId: null,
        sortOrder: 0,
        createdAt: "2025-11-05T00:00:00.000Z",
      },
    ]);
    render(<WorkSearch todayISO="2026-11-09" />);

    fireEvent.change(screen.getByLabelText("기록 검색"), { target: { value: "나" } });
    expect(searchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("기록 검색"), { target: { value: "나스" } });
    await waitFor(() => expect(searchMock).toHaveBeenCalledWith("나스"));

    const link = await screen.findByRole("link", { name: /패스워드 변경/ });
    expect(link).toHaveAttribute("href", "/tasks?week=2025-11-03");
    expect(link).toHaveTextContent("2025.11.5 (수)");
  });

  it("전체 기록 CSV 내려받기 링크가 있다", () => {
    render(<WorkSearch todayISO="2026-11-09" />);
    expect(screen.getByRole("link", { name: /전체 기록 CSV/ })).toHaveAttribute("href", "/tasks/export");
  });
});
