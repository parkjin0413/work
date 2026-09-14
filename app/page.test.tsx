import { describe, it, expect, vi, beforeEach } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

import HomePage from "./page";

describe("HomePage", () => {
  beforeEach(() => {
    redirectMock.mockClear();
  });

  it("별도 대시보드 없이 /tasks 로 리다이렉트한다", () => {
    expect(() => HomePage()).toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/tasks");
  });
});
