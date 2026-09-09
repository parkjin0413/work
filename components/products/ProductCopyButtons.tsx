"use client";

import { CopyButton } from "./CopyButton";
import { DownloadButton } from "./DownloadButton";

type Props = {
  plain: string;
  markdown: string;
  json: string;
  claude: string;
  /** 있으면 product.md 원문을 이 이름으로 내려받는 버튼을 추가 */
  downloadName?: string;
};

/** 데이터시트 헤더의 복사 버튼 + (선택) MD 다운로드. 문자열은 서버에서 만들어 내려준다. */
export function ProductCopyButtons({ plain, markdown, json, claude, downloadName }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton text={plain} label="텍스트" />
      <CopyButton text={markdown} label="마크다운 원문" />
      <CopyButton text={json} label="JSON" />
      <CopyButton text={claude} label="Claude용" />
      {downloadName && markdown ? (
        <DownloadButton text={markdown} filename={downloadName} label="MD 다운로드" />
      ) : null}
    </div>
  );
}
