import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** 업무관리 페이지의 세 영역(주간 메모 정리 / 고정 업무 / 업무 목록)을 같은 모양으로 구분해준다. */
export function SectionHeader({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
