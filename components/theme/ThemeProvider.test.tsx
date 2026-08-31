import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

// jsdom does not load real stylesheets, so this test cannot observe actual
// computed CSS background colors. It instead verifies the mechanism that
// drives the token-based light/dark theming: that next-themes actually
// toggles the "dark" class on <html> when the user switches themes, which
// is what makes app/globals.css's `.dark { ... }` token overrides apply.
describe("ThemeProvider light/dark toggle", () => {
  // next-themes persists the last chosen theme to localStorage, which
  // otherwise leaks between test cases in this file (a later test would
  // see the previous test's theme instead of the ThemeProvider's
  // defaultTheme="dark"). Reset storage and the <html> class before each
  // test so every case starts from the real default.
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark", "light");
  });

  it("다크에서 라이트로 전환하면 html 요소의 dark 클래스가 제거된다", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = await screen.findByRole("button", { name: "라이트 모드로 전환" });
    fireEvent.click(toggleButton);

    expect(await screen.findByRole("button", { name: "다크 모드로 전환" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("라이트에서 다크로 전환하면 html 요소에 dark 클래스가 추가된다", async () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = await screen.findByRole("button", { name: "라이트 모드로 전환" });
    fireEvent.click(toggleButton);
    await screen.findByRole("button", { name: "다크 모드로 전환" });

    fireEvent.click(await screen.findByRole("button", { name: "다크 모드로 전환" }));

    expect(await screen.findByRole("button", { name: "라이트 모드로 전환" })).toBeInTheDocument();
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
});
