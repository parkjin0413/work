import {
  CATEGORY_ORDER,
  slugToLabel,
  CATEGORY_GROUP_HEADING,
  type CategoryLabel,
} from "@/lib/products/categories";
import { usedAttrsForCategory } from "@/lib/products/attributeSchema";
import type { CatalogRow, ProductAttributeValue } from "@/lib/products/productsStore";

/** 값이 "표시됨"으로 볼 수 있는지 (null/false/"" 는 아님). */
function isPresent(v: ProductAttributeValue): boolean {
  return v !== null && v !== false && v !== "";
}

function Dot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 rounded-full border ${
        on ? "border-accent bg-accent" : "border-border"
      }`}
    />
  );
}

/**
 * 제품 규격 총괄표. 분류(벽재/바닥재/천장재) 그룹마다 헤더를 다시 그린다 —
 * 확장 컬럼 세트가 분류마다 다르기 때문. 코어 컬럼(화재·환경표지·항균·유해물질·
 * 방수방습)은 항상, 확장 컬럼은 그 분류에 값이 하나라도 있을 때만 렌더한다.
 *
 * `categories` 를 주면 그 분류 그룹만 렌더 (분류 페이지용). 생략하면 전 분류(랜딩용).
 */
export function RollupTable({
  rows,
  categories,
}: {
  rows: CatalogRow[];
  categories?: CategoryLabel[];
}) {
  const byCategory = new Map<CategoryLabel, CatalogRow[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  const labels = categories ?? CATEGORY_ORDER.map(slugToLabel);

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        {labels.map((label) => {
          const group = byCategory.get(label) ?? [];
          const defs = usedAttrsForCategory(label, (key) =>
            group.some((row) => isPresent(row.attributes[key] ?? null))
          );
          const colCount = 2 + defs.length;
          return (
            <tbody key={label}>
              <tr>
                <td
                  colSpan={colCount}
                  className="bg-surface-hover px-3 py-2 text-xs font-bold uppercase tracking-wide text-muted"
                >
                  {CATEGORY_GROUP_HEADING[label]}
                </td>
              </tr>
              <tr className="bg-surface-hover/60 text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="whitespace-nowrap px-3 py-2 font-semibold">품목</th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">규격 (W×H×T)</th>
                {defs.map((d) => (
                  <th key={d.key} className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                    {d.label}
                  </th>
                ))}
              </tr>

              {group.length === 0 ? (
                <tr>
                  <td colSpan={colCount} className="px-3 py-4 text-xs italic text-muted">
                    등록된 제품이 없습니다.
                  </td>
                </tr>
              ) : (
                group.map((row, i) => (
                  <tr
                    key={`${row.slug}-${row.group ?? ""}-${row.typeName}-${i}`}
                    className="border-t border-border hover:bg-surface-hover"
                  >
                    <td className="px-3 py-2 text-foreground">
                      {row.group ? `[${row.group}] ` : ""}
                      {row.productName} {row.typeName}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted">
                      {row.size || "-"}
                    </td>
                    {defs.map((d) => {
                      const v = row.attributes[d.key] ?? null;
                      if (d.format === "text") {
                        return (
                          <td key={d.key} className="px-3 py-2 text-center">
                            <span className={isPresent(v) ? "font-semibold text-accent" : "text-muted"}>
                              {isPresent(v) ? String(v) : "-"}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={d.key} className="px-3 py-2 text-center">
                          <Dot on={isPresent(v)} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
