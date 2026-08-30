import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GmailPage from "./gmail/page";
import DrivePage from "./drive/page";
import NotionPage from "./notion/page";

describe("서비스별 빈 라우트", () => {
  it("Gmail 페이지는 한글 안내 문구를 보여준다", () => {
    render(<GmailPage />);
    expect(screen.getByText("Gmail 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
  });

  it("Drive 페이지는 한글 안내 문구를 보여준다", () => {
    render(<DrivePage />);
    expect(
      screen.getByText("Google Drive 연동 기능은 다음 단계에서 구현됩니다.")
    ).toBeInTheDocument();
  });

  it("Notion 페이지는 한글 안내 문구를 보여준다", () => {
    render(<NotionPage />);
    expect(screen.getByText("Notion 연동 기능은 다음 단계에서 구현됩니다.")).toBeInTheDocument();
  });
});
