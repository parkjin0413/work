import { Fragment } from "react";
import type { Product } from "@/lib/products/productsStore";
import { DATASHEET_SECTIONS, NoteBlock } from "./datasheetSections";
import { ProductCopyButtons } from "./ProductCopyButtons";

export type ComparisonItem = {
  product: Product;
  copy: { plain: string; markdown: string; json: string; claude: string };
};

/**
 * 항목별 N열 비교. 왼쪽 라벨 거터 + 제품마다 위→아래로 이어지는 테두리 박스 한 개.
 * 같은 섹션은 같은 그리드 행에 놓여 제품 박스끼리 가로로 정렬된다.
 * 전 제품 전체 내용이 이 한 화면에 다 나오므로 개별 페이지로 갈 필요가 없다.
 */
// 제품 1열의 최소 폭. 천장재(2열)에서 보기 좋았던 폭을 전 분류 공통 하한으로 고정 —
// 제품 수가 늘면 열이 좁아지는 대신 가로 스크롤이 길어진다.
const COLUMN_MIN_WIDTH = 480;
const LABEL_GUTTER = 112;
const COLUMN_GAP = 12;

export function ProductComparison({ items }: { items: ComparisonItem[] }) {
  const n = items.length;
  const gridTemplateColumns = `${LABEL_GUTTER}px repeat(${n}, minmax(${COLUMN_MIN_WIDTH}px, 1fr))`;
  const minWidth = LABEL_GUTTER + n * (COLUMN_MIN_WIDTH + COLUMN_GAP);

  const hasDataNote = items.some(({ product }) => product.dataNote);
  const lastIndex = DATASHEET_SECTIONS.length - 1;

  const gutter = "pt-3 pr-2 text-[11px] font-semibold uppercase tracking-wide text-muted";
  const cellBase = "border-x border-border bg-surface px-4 py-3 min-w-0";

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid gap-x-3" style={{ gridTemplateColumns, minWidth }}>
        {/* ── 열 머리 (제품명·타입·복사·단독 링크) ── */}
        <div aria-hidden="true" />
        {items.map(({ product, copy }) => (
          <div
            key={product.slug}
            id={product.slug}
            className="scroll-mt-20 rounded-t-lg border-x border-t border-border bg-surface px-4 pb-3 pt-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">
              {product.productType}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-foreground">{product.name}</h3>
              {product.status === "discontinued" ? (
                <span className="rounded bg-danger-bg px-1.5 py-0.5 text-[10px] font-medium text-danger">
                  단종
                </span>
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {product.types.map((t, i) => (
                <span
                  key={i}
                  className="rounded bg-surface-hover px-1.5 py-0.5 text-[10px] font-medium text-muted"
                >
                  {t.group ? `${t.group} · ` : ""}
                  {t.typeName}
                </span>
              ))}
            </div>
            <div className="mt-2">
              <ProductCopyButtons
                plain={copy.plain}
                markdown={copy.markdown}
                json={copy.json}
                claude={copy.claude}
              />
            </div>
          </div>
        ))}

        {/* ── 요약 ── */}
        <div className={gutter}>요약</div>
        {items.map(({ product }) => (
          <div key={product.slug} className={`${cellBase} border-t border-border/70`}>
            <p className="text-xs text-muted">{product.summary || "정보 없음"}</p>
          </div>
        ))}

        {/* ── 확인 필요 메모 (있을 때만) ── */}
        {hasDataNote ? (
          <>
            <div className={gutter}>확인 필요</div>
            {items.map(({ product }) => (
              <div key={product.slug} className={`${cellBase} border-t border-border/70`}>
                {product.dataNote ? (
                  <NoteBlock prefix="확인 필요" text={product.dataNote} />
                ) : (
                  <span className="text-xs italic text-muted">—</span>
                )}
              </div>
            ))}
          </>
        ) : null}

        {/* ── 데이터시트 섹션 ── */}
        {DATASHEET_SECTIONS.map(({ key, label, Cell }, si) => (
          <Fragment key={key}>
            <div className={gutter}>{label}</div>
            {items.map(({ product }) => (
              <div
                key={product.slug}
                className={`${cellBase} border-t border-border/70 ${
                  si === lastIndex ? "rounded-b-lg border-b" : ""
                }`}
              >
                <Cell product={product} />
              </div>
            ))}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
