import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DriveSummaryCard } from "./DriveSummaryCard";

describe("DriveSummaryCard", () => {
  it("연결되지 않은 경우 연결 안내를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "not_connected" }} />);

    expect(screen.getByText("Google 계정 연결이 필요합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Google Drive/ })).toHaveAttribute("href", "/drive");
  });

  it("조회가 실패하면 재연결 안내를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "error" }} />);

    expect(
      screen.getByText("연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });

  it("파일이 없으면 안내 문구를 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "ok", names: [] }} />);

    expect(screen.getByText("파일이 없습니다.")).toBeInTheDocument();
  });

  it("최근 파일 이름 목록을 보여준다", () => {
    render(<DriveSummaryCard summary={{ state: "ok", names: ["문서1.txt", "문서2.txt"] }} />);

    expect(screen.getByText("문서1.txt")).toBeInTheDocument();
    expect(screen.getByText("문서2.txt")).toBeInTheDocument();
  });
});
