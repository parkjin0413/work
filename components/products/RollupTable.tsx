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

// 분류별 색 — 총괄표에서 벽/바닥/천장을 한눈에 구분. (JIT 안전하게 인라인 스타일)
const CATEGORY_STYLE: Record<CategoryLabel, { bar: string; tint: string; text: string }> = {
  벽재: { bar: "#4F46E5", tint: "rgba(79,70,229,0.10)", text: "#4F46E5" },
  바닥재: { bar: "#C2410C", tint: "rgba(194,65,12,0.10)", text: "#C2410C" },
  천장재: { bar: "#0F766E", tint: "rgba(15,118,110,0.10)", text: "#0F766E" },
};

function Dot({ on, color }: { on: boolean; color: string }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-2.5 w-2.5 rounded-full border"
      style={on ? { background: color, borderColor: color } : { borderColor: "var(--color-border)" }}
    />
  );
}

/**
 * 제품 규격 총괄표. 분류(벽재/바닥재/천장재) 그룹마다 색이 있는 헤더 바 + 왼쪽
 * 색 띠로 확실히 구분한다. 확장 컬럼 세트가 분류마다 달라 헤더를 다시 그린다.
 * 성능값은 각 제품 `certifications` 에서 파생됨.
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
        {labels.map((label, groupIdx) => {
          const group = byCategory.get(label) ?? [];
          const c = CATEGORY_STYLE[label];
          const defs = usedAttrsForCategory(label, (key) =>
            group.some((row) => isPresent(row.attributes[key] ?? null))
          );
          const colCount = 2 + defs.length;
          return (
            <tbody key={label}>
              {/* 분류 사이 여백 — 첫 그룹 제외 */}
              {groupIdx > 0 ? (
                <tr aria-hidden="true">
                  <td colSpan={colCount} className="h-6 bg-bg p-0" />
                </tr>
              ) : null}
              {/* 분류 헤더 바 — 색 채운 바 */}
              <tr>
                <td
                  colSpan={colCount}
                  className="px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-white"
                  style={{ background: c.bar }}
                >
                  {CATEGORY_GROUP_HEADING[label]}
                </td>
              </tr>
              {/* 컬럼 헤더 — 분류 색 옅게 */}
              <tr
                className="text-left text-[11px] uppercase tracking-wide"
                style={{ background: c.tint, color: c.text }}
              >
                <th className="whitespace-nowrap border-l-4 px-3 py-2 font-semibold" style={{ borderColor: c.bar }}>
                  품목
                </th>
                <th className="whitespace-nowrap px-3 py-2 font-semibold">규격 (W×H×T)</th>
                {defs.map((d) => (
                  <th key={d.key} className="whitespace-nowrap px-3 py-2 text-center font-semibold">
                    {d.label}
                  </th>
                ))}
              </tr>

              {group.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="border-l-4 px-3 py-4 text-xs italic text-muted"
                    style={{ borderColor: c.bar }}
                  >
                    등록된 제품이 없습니다.
                  </td>
                </tr>
              ) : (
                group.map((row, i) => (
                  <tr
                    key={`${row.slug}-${row.group ?? ""}-${row.typeName}-${i}`}
                    className="border-t border-border hover:bg-surface-hover"
                  >
                    <td
                      className="border-l-4 px-3 py-2 text-foreground"
                      style={{ borderColor: c.bar }}
                    >
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
                            <span
                              className={isPresent(v) ? "font-semibold" : "text-muted"}
                              style={isPresent(v) ? { color: c.text } : undefined}
                            >
                              {isPresent(v) ? String(v) : "-"}
                            </span>
                          </td>
                        );
                      }
                      return (
                        <td key={d.key} className="px-3 py-2 text-center">
                          <Dot on={isPresent(v)} color={c.bar} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
              {/* 그룹 하단 마감선 — 분류 색 */}
              <tr aria-hidden="true">
                <td
                  colSpan={colCount}
                  className="p-0"
                  style={{ height: 3, background: c.bar }}
                />
              </tr>
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
