import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DownloadButton } from "./DownloadButton";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DownloadButton", () => {
  it("라벨을 보여주고 클릭 시 해당 파일명으로 blob 다운로드를 만든다", () => {
    const createURL = vi.fn((_blob: Blob) => "blob:mock");
    const revokeURL = vi.fn((_url: string) => undefined);
    vi.stubGlobal("URL", { createObjectURL: createURL, revokeObjectURL: revokeURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<DownloadButton text="# 제품" filename="laminate-tile-hpl.md" label="MD 다운로드" />);

    const btn = screen.getByRole("button", { name: "MD 다운로드" });
    fireEvent.click(btn);

    expect(createURL).toHaveBeenCalledTimes(1);
    const blob = createURL.mock.calls[0][0];
    expect(blob.type).toContain("text/markdown");
    expect(clickSpy).toHaveBeenCalledTimes(1);
    // 클릭 후 "저장됨" 피드백
    expect(screen.getByRole("button", { name: "MD 다운로드" }).textContent).toContain("저장됨");
  });
});
