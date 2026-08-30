import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GmailSummaryCard } from "./GmailSummaryCard";

describe("GmailSummaryCard", () => {
  it("연결되지 않은 경우 연결 안내를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "not_connected" }} />);

    expect(screen.getByText("Google 계정 연결이 필요합니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Gmail/ })).toHaveAttribute("href", "/gmail");
  });

  it("조회가 실패하면 재연결 안내를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "error" }} />);

    expect(
      screen.getByText("연결이 만료되었거나 문제가 발생했습니다. 다시 연결해주세요.")
    ).toBeInTheDocument();
  });

  it("받은 메일이 없으면 안내 문구를 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "ok", subjects: [] }} />);

    expect(screen.getByText("받은 메일이 없습니다.")).toBeInTheDocument();
  });

  it("최근 메일 제목 목록을 보여준다", () => {
    render(<GmailSummaryCard summary={{ state: "ok", subjects: ["제목1", "제목2"] }} />);

    expect(screen.getByText("제목1")).toBeInTheDocument();
    expect(screen.getByText("제목2")).toBeInTheDocument();
  });
});
