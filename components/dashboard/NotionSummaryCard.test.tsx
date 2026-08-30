import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotionSummaryCard } from "./NotionSummaryCard";

describe("NotionSummaryCard", () => {
  it("설정되지 않은 경우 안내를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "not_configured" }} />);

    expect(screen.getByText("Notion 연동이 설정되지 않았습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Notion/ })).toHaveAttribute("href", "/notion");
  });

  it("조회가 실패하면 환경변수 확인 안내를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "error" }} />);

    expect(screen.getByText("NOTION_API_KEY 값을 확인해주세요.")).toBeInTheDocument();
  });

  it("공유된 데이터베이스가 없으면 안내 문구를 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "empty" }} />);

    expect(screen.getByText("공유된 데이터베이스가 없습니다.")).toBeInTheDocument();
  });

  it("공유된 데이터베이스 제목 목록을 보여준다", () => {
    render(<NotionSummaryCard summary={{ state: "ok", titles: ["할 일 목록", "프로젝트"] }} />);

    expect(screen.getByText("할 일 목록")).toBeInTheDocument();
    expect(screen.getByText("프로젝트")).toBeInTheDocument();
  });
});
