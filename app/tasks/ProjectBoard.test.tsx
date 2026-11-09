import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Project } from "@/lib/tasks/projects";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
  setProjectCompletedAction: vi.fn(),
  deleteProjectAction: vi.fn(),
  addProjectStepAction: vi.fn(),
  updateWorkItemAction: vi.fn(),
  deleteWorkItemAction: vi.fn(),
}));
vi.mock("./projectActions", () => actions);
vi.mock("./workItemActions", () => actions);

import { ProjectBoard } from "./ProjectBoard";

function project(partial: Partial<Project> & Pick<Project, "id" | "name">): Project {
  return {
    memo: null,
    kind: "project",
    isCompleted: false,
    completedAt: null,
    createdAt: "2026-11-01T00:00:00.000Z",
    steps: [],
    scheduled: [],
    done: [],
    lastDoneDate: null,
    ...partial,
  };
}

const homepage = project({
  id: "p1",
  name: "홈페이지 리뉴얼",
  steps: [{ id: "s1", body: "게시판 테이블 설계", sortOrder: 0, createdAt: "2026-11-05T00:00:00.000Z" }],
  done: [{ id: "d1", date: "2026-11-04", body: "사이트맵 구성", status: "done" }],
  lastDoneDate: "2026-11-04",
});

describe("ProjectBoard", () => {
  beforeEach(() => Object.values(actions).forEach((fn) => fn.mockReset().mockResolvedValue(undefined)));

  it("진행 중 / 상시 업무로 나누고, 첫 프로젝트의 단계와 기록을 보여준다", () => {
    render(
      <ProjectBoard
        projects={[homepage, project({ id: "p2", name: "나스 관리", kind: "ongoing" })]}
        todayISO="2026-11-09"
      />
    );

    expect(screen.getByText("상시 업무", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /홈페이지 리뉴얼/ })).toBeInTheDocument();
    expect(screen.getByText("게시판 테이블 설계")).toBeInTheDocument();
    expect(screen.getByText("사이트맵 구성")).toBeInTheDocument();
  });

  it("단계에 날짜를 정하면 그 날짜로 저장하고 예정으로 옮긴다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    fireEvent.click(screen.getByRole("button", { name: "게시판 테이블 설계 날짜 정하기" }));
    fireEvent.click(screen.getByRole("button", { name: "11.16 (월) 선택" }));
    expect(actions.updateWorkItemAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "확인" }));

    await waitFor(() => expect(actions.updateWorkItemAction).toHaveBeenCalledWith("s1", { date: "2026-11-16" }));
    expect(screen.getByText("예정")).toBeInTheDocument();
  });

  it("단계 체크는 오늘 한 일로 완료한다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    fireEvent.click(screen.getByRole("button", { name: "게시판 테이블 설계 오늘 한 일로 완료" }));

    await waitFor(() =>
      expect(actions.updateWorkItemAction).toHaveBeenCalledWith("s1", { date: "2026-11-09", status: "done" })
    );
  });

  it("단계를 Enter로 추가한다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    const input = screen.getByLabelText("단계 추가");
    fireEvent.change(input, { target: { value: "와이어프레임 작성" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(actions.addProjectStepAction).toHaveBeenCalledWith("p1", "와이어프레임 작성"));
    expect(screen.getByText("와이어프레임 작성")).toBeInTheDocument();
  });

  it("종류를 상시 업무로 바꿀 수 있다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    fireEvent.click(screen.getByRole("radio", { name: "상시 업무" }));

    await waitFor(() => expect(actions.updateProjectAction).toHaveBeenCalledWith("p1", { kind: "ongoing" }));
  });
});
