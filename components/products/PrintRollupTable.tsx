import {
  CATEGORY_ORDER,
  slugToLabel,
  CATEGORY_GROUP_HEADING,
  type CategoryLabel,
} from "@/lib/products/categories";
import { usedAttrsForCategory } from "@/lib/products/attributeSchema";
import type { CatalogRow, ProductAttributeValue } from "@/lib/products/productsStore";

function isPresent(v: ProductAttributeValue): boolean {
  return v !== null && v !== false && v !== "";
}

/**
 * 인쇄용 제품 규격 총괄표 — 흑백, 얇은 테두리, 압축 여백.
 * 분류(벽재/바닥재/천장재)마다 표를 다시 그린다(확장 컬럼 세트가 달라서).
 * 화면용 RollupTable 과 같은 데이터(제품 × 타입, certifications 에서 파생)를 쓴다.
 */
export function PrintRollupTable({ rows }: { rows: CatalogRow[] }) {
  const byCategory = new Map<CategoryLabel, CatalogRow[]>();
  for (const row of rows) {
    const list = byCategory.get(row.category) ?? [];
    list.push(row);
    byCategory.set(row.category, list);
  }

  return (
    <div className="space-y-6 text-[9.5px] leading-tight text-black">
      {CATEGORY_ORDER.map(slugToLabel).map((label) => {
        const group = byCategory.get(label) ?? [];
        const defs = usedAttrsForCategory(label, (key) =>
          group.some((row) => isPresent(row.attributes[key] ?? null))
        );
        return (
          <section key={label} className="break-inside-avoid">
            <h3 className="mb-1 break-after-avoid bg-black px-2 py-1 text-[11px] font-bold text-white">
              {CATEGORY_GROUP_HEADING[label]} · {group.length}행
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="break-after-avoid bg-neutral-100 text-left">
                  <th className="border border-neutral-400 px-1.5 py-1 font-semibold">품목</th>
                  <th className="border border-neutral-400 px-1.5 py-1 font-semibold">
                    규격 (W×H×T)
                  </th>
                  {defs.map((d) => (
                    <th
                      key={d.key}
                      className="border border-neutral-400 px-1 py-1 text-center font-semibold"
                    >
                      {d.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {group.length === 0 ? (
                  <tr>
                    <td
                      colSpan={2 + defs.length}
                      className="border border-neutral-300 px-1.5 py-1.5 italic text-neutral-500"
                    >
                      등록된 제품이 없습니다.
                    </td>
                  </tr>
                ) : (
                  group.map((row, i) => (
                    <tr key={`${row.slug}-${row.group ?? ""}-${row.typeName}-${i}`} className="break-inside-avoid">
                      <td className="border border-neutral-300 px-1.5 py-1 align-top">
                        {row.group ? `[${row.group}] ` : ""}
                        {row.productName} {row.typeName}
                      </td>
                      <td className="border border-neutral-300 px-1.5 py-1 align-top font-mono text-[9px]">
                        {row.size || "-"}
                      </td>
                      {defs.map((d) => {
                        const v = row.attributes[d.key] ?? null;
                        if (d.format === "text") {
                          return (
                            <td
                              key={d.key}
                              className="border border-neutral-300 px-1 py-1 text-center align-top"
                            >
                              {isPresent(v) ? String(v) : "–"}
                            </td>
                          );
                        }
                        return (
                          <td
                            key={d.key}
                            className="border border-neutral-300 px-1 py-1 text-center align-top"
                          >
                            {isPresent(v) ? "●" : "○"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
