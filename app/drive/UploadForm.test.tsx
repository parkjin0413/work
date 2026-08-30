import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { UploadForm } from "./UploadForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}));

const { uploadFileActionMock } = vi.hoisted(() => ({
  uploadFileActionMock: vi.fn(),
}));

vi.mock("./actions", () => ({
  uploadFileAction: uploadFileActionMock,
}));

function makeFile(name: string, content: string, type: string) {
  return new File([content], name, { type });
}

describe("UploadForm", () => {
  beforeEach(() => {
    refreshMock.mockClear();
    uploadFileActionMock.mockReset();
  });

  it("파일을 선택하고 제출하면 업로드 액션을 호출한다", async () => {
    uploadFileActionMock.mockResolvedValue(undefined);

    render(<UploadForm folderId="root" />);

    const input = screen.getByLabelText("업로드할 파일") as HTMLInputElement;
    const file = makeFile("test.txt", "hello", "text/plain");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    await waitFor(() => expect(uploadFileActionMock).toHaveBeenCalledTimes(1));
    const formData = uploadFileActionMock.mock.calls[0][0] as FormData;
    expect(formData.get("folderId")).toBe("root");
    expect((formData.get("file") as File).name).toBe("test.txt");
    expect(refreshMock).toHaveBeenCalled();
  });

  it("업로드에 실패하면 한글 에러 메시지를 보여준다", async () => {
    uploadFileActionMock.mockRejectedValue(new Error("upload failed"));

    render(<UploadForm folderId="root" />);

    const input = screen.getByLabelText("업로드할 파일") as HTMLInputElement;
    const file = makeFile("test.txt", "hello", "text/plain");
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "업로드" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "업로드에 실패했습니다. 잠시 후 다시 시도해주세요."
    );
    expect(screen.getByRole("button", { name: "업로드" })).not.toBeDisabled();
  });
});
