"use client";

import { CopyButton } from "./CopyButton";

type Props = {
  plain: string;
  markdown: string;
  json: string;
  claude: string;
};

/** 데이터시트 헤더의 복사 버튼 4종. 문자열은 서버에서 만들어 내려준다. */
export function ProductCopyButtons({ plain, markdown, json, claude }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <CopyButton text={plain} label="텍스트" />
      <CopyButton text={markdown} label="마크다운 원문" />
      <CopyButton text={json} label="JSON" />
      <CopyButton text={claude} label="Claude용" />
    </div>
  );
}
