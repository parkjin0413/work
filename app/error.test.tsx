import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Error from "./error";

describe("Error", () => {
  it("문제가 발생했다는 한글 안내와 홈으로 가는 링크를 보여준다", () => {
    render(<Error error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByText("문제가 발생했습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "홈으로" })).toHaveAttribute("href", "/");
  });

  it("다시 시도 버튼을 클릭하면 reset을 호출한다", () => {
    const resetMock = vi.fn();
    render(<Error error={new Error("boom")} reset={resetMock} />);

    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(resetMock).toHaveBeenCalledTimes(1);
  });
});
