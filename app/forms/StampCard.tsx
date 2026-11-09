"use client";

import { useTransition } from "react";
import { deleteStampAction, uploadStampAction } from "./actions";
import { FormError, SubmitButton, useActionForm } from "./FormControls";

/** 내 도장: 품의서·휴가신청서의 "담당" 칸에 자동으로 찍힌다. */
export function StampCard({ stampUrl }: { stampUrl: string | null }) {
  const { error, pending, onSubmit } = useActionForm(uploadStampAction);
  const [isDeleting, startDelete] = useTransition();

  return (
    <section aria-label="내 도장" className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold text-foreground">내 도장</h2>
      <p className="mt-1 text-sm text-muted">등록하면 문서의 담당 칸에 자동으로 찍힙니다. 배경이 투명한 PNG가 가장 깔끔합니다.</p>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-border bg-white">
          {stampUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- 비공개 버킷 서명 URL
            <img src={stampUrl} alt="등록된 도장" className="h-16 w-16 object-contain" />
          ) : (
            <span className="text-xs text-[#8A8270]">없음</span>
          )}
        </div>

        {/* 도장이 바뀌면(주소가 바뀌면) 폼을 새로 그려 고른 파일 이름을 지운다 */}
        <form key={stampUrl ?? "none"} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            name="stamp"
            accept="image/png,image/jpeg,image/webp"
            aria-label="도장 이미지 파일"
            required
            className="max-w-[16rem] text-sm text-muted file:mr-2 file:rounded-lg file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          />
          <SubmitButton label={stampUrl ? "바꾸기" : "등록"} pending={pending} />
          {stampUrl && (
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                if (!window.confirm("등록된 도장을 지울까요?")) return;
                startDelete(() => deleteStampAction());
              }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-danger hover:bg-danger-bg disabled:opacity-60"
            >
              지우기
            </button>
          )}
        </form>
      </div>
      <div className="mt-2">
        <FormError error={error} />
      </div>
    </section>
  );
}
