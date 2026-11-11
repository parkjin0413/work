import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import type { Project } from "@/lib/tasks/projects";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const actions = vi.hoisted(() => ({
  createProjectAction: vi.fn(),
  updateProjectAction: vi.fn(),
  setProjectCompletedAction: vi.fn(),
  deleteProjectAction: vi.fn(),
  addProjectStepAction: vi.fn(),
  addProjectStepsAction: vi.fn(),
  updateWorkItemAction: vi.fn(),
  deleteWorkItemAction: vi.fn(),
  reorderWorkItemsAction: vi.fn(),
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
      />,
    );

    expect(screen.getByText("상시 업무", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /홈페이지 리뉴얼/ })).toBeInTheDocument();
    // 남은 단계는 프로젝트 상세와 위쪽 "날짜 미정" 카드 두 곳에 보인다
    expect(screen.getAllByText("게시판 테이블 설계")).toHaveLength(2);
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
      expect(actions.updateWorkItemAction).toHaveBeenCalledWith("s1", { date: "2026-11-09", status: "done" }),
    );
  });

  it("단계를 Enter로 추가한다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    const input = screen.getByLabelText("단계 추가");
    fireEvent.change(input, { target: { value: "와이어프레임 작성" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(actions.addProjectStepAction).toHaveBeenCalledWith("p1", "와이어프레임 작성"));
    // 남은 단계는 프로젝트 상세와 위쪽 "날짜 미정" 카드 두 곳에 보인다
    expect(screen.getAllByText("와이어프레임 작성")).toHaveLength(2);
  });

  it("여러 줄을 붙여넣으면 한 줄씩 단계로 추가한다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    fireEvent.paste(screen.getByLabelText("단계 추가"), {
      clipboardData: { getData: () => '"1. 사이트맵 확정\n2. 게시판 설계"' },
    });

    await waitFor(() =>
      expect(actions.addProjectStepsAction).toHaveBeenCalledWith("p1", ["사이트맵 확정", "게시판 설계"]),
    );
    // 남은 단계는 프로젝트 상세와 위쪽 "날짜 미정" 카드 두 곳에 보인다
    expect(screen.getAllByText("사이트맵 확정")).toHaveLength(2);
  });

  it("종류를 상시 업무로 바꿀 수 있다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);

    fireEvent.click(screen.getByRole("radio", { name: "상시 업무" }));

    await waitFor(() => expect(actions.updateProjectAction).toHaveBeenCalledWith("p1", { kind: "ongoing" }));
  });
  it("날짜 미정 카드: 진행 중인 프로젝트의 남은 단계를 모아 보여주고, 날짜를 정하면 예정으로 옮긴다", async () => {
    render(
      <ProjectBoard
        projects={[
          homepage,
          project({
            id: "p3",
            name: "끝난 프로젝트",
            isCompleted: true,
            steps: [{ id: "s9", body: "끝난 단계", sortOrder: 0, createdAt: "2026-11-05T00:00:00.000Z" }],
          }),
        ]}
        todayISO="2026-11-09"
      />,
    );

    const undated = screen.getByRole("region", { name: "날짜 미정" });
    expect(within(undated).getByText("게시판 테이블 설계")).toBeInTheDocument();
    expect(within(undated).queryByText("끝난 단계")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "날짜 미정: 게시판 테이블 설계 날짜 정하기" }));
    fireEvent.click(within(undated).getByRole("button", { name: "11.17 (화) 선택" }));
    fireEvent.click(within(undated).getByRole("button", { name: "확인" }));

    await waitFor(() => expect(actions.updateWorkItemAction).toHaveBeenCalledWith("s1", { date: "2026-11-17" }));
    expect(screen.queryByRole("region", { name: "날짜 미정" })).not.toBeInTheDocument();
    expect(screen.getByText("예정")).toBeInTheDocument();
  });

  it("날짜 미정 카드에서 체크하면 오늘 한 일로 완료한다", async () => {
    render(<ProjectBoard projects={[homepage]} todayISO="2026-11-09" />);
    fireEvent.click(screen.getByRole("button", { name: "날짜 미정: 게시판 테이블 설계 오늘 한 일로 완료" }));
    await waitFor(() =>
      expect(actions.updateWorkItemAction).toHaveBeenCalledWith("s1", { date: "2026-11-09", status: "done" }),
    );
  });
});
