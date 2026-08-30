import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./ThemeToggle";

function renderWithTheme() {
  return render(
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>
  );
}

describe("ThemeToggle", () => {
  it("다크 모드일 때 라이트 모드로 전환하는 버튼을 보여준다", async () => {
    renderWithTheme();
    expect(await screen.findByRole("button", { name: "라이트 모드로 전환" })).toBeInTheDocument();
  });

  it("버튼을 클릭하면 다크 모드로 전환하는 옵션으로 바뀐다", async () => {
    renderWithTheme();
    const button = await screen.findByRole("button", { name: "라이트 모드로 전환" });
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
  });
});
