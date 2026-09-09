import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RollupTable } from "./RollupTable";
import type { CatalogRow } from "@/lib/products/productsStore";

const wallRows: CatalogRow[] = [
  {
    category: "벽재",
    productName: "프라임 타공보드",
    slug: "prime-perforated-board",
    categorySlug: "wall",
    typeName: "9T",
    group: "원형타공",
    size: "1195 x 595 x 9 mm",
    attributes: { fire: "준불연", eco: true, hyg: true, voc: true, aco: "흡음계수 0.35", imp: null },
  },
  {
    category: "벽재",
    productName: "라미네이트 판넬 10.2T",
    slug: "laminate-panel-10-2t",
    categorySlug: "wall",
    typeName: "10.2T",
    group: null,
    size: "600 x 2400 x 10.2 mm",
    attributes: { fire: null, eco: null, hyg: null, voc: null, aco: null, imp: true },
  },
];

const floorRows: CatalogRow[] = [
  {
    category: "바닥재",
    productName: "라미네이트 후로링",
    slug: "laminate-flooring",
    categorySlug: "floor",
    typeName: "ORIGINAL",
    group: null,
    size: "198 x 1207 x 11 mm",
    // slip=DS, abrasion=AC6 은 값 있음, dim_stability 는 이 fixture 에선 값 없음
    attributes: { fire: null, eco: true, hyg: null, voc: true, slip: "DS", abrasion: "AC6", dim_stability: null },
  },
];

describe("RollupTable", () => {
  it("코어 컬럼은 분류 그룹마다 항상, 확장은 값 있을 때만", () => {
    render(<RollupTable rows={[...wallRows, ...floorRows]} />);

    expect(screen.getByText("WALL · 벽 마감재")).toBeInTheDocument();
    expect(screen.getByText("FLOOR · 바닥 마감재")).toBeInTheDocument();
    expect(screen.getByText("CEILING · 천장 마감재")).toBeInTheDocument();

    // 코어 4개는 3개 분류 그룹 헤더에 반복
    for (const label of ["화재", "환경표지", "항균", "유해물질"]) {
      expect(screen.getAllByText(label)).toHaveLength(3);
    }

    // 벽재 확장: aco/imp 는 벽재 rows 에 값이 있어 렌더
    expect(screen.getByText("흡음·차음")).toBeInTheDocument();
    expect(screen.getByText("내충격")).toBeInTheDocument();

    // 바닥재 확장: slip/abrasion 만 값이 있음 → 렌더, "치수안정성" 은 숨김
    expect(screen.getByText("미끄럼저항")).toBeInTheDocument();
    expect(screen.getByText("내마모")).toBeInTheDocument();
    expect(screen.queryByText("치수안정성")).not.toBeInTheDocument();
  });

  it("품목 행과 text 포맷 값을 보여준다", () => {
    render(<RollupTable rows={[...wallRows, ...floorRows]} />);
    expect(screen.getByText(/\[원형타공\] 프라임 타공보드 9T/)).toBeInTheDocument();
    expect(screen.getByText("준불연")).toBeInTheDocument();
    expect(screen.getByText("AC6")).toBeInTheDocument();
    expect(screen.getByText("DS")).toBeInTheDocument();
  });

  it("데이터 없는 분류는 코어 컬럼만 + 빈 상태 문구", () => {
    render(<RollupTable rows={wallRows} />);
    // floor, ceiling 은 rows 없음
    expect(screen.getAllByText("등록된 제품이 없습니다.")).toHaveLength(2);
    // 확장 컬럼은 아무것도 안 나옴 (벽재 제외)
    expect(screen.queryByText("미끄럼저항")).not.toBeInTheDocument();
    expect(screen.queryByText("흡음률(NRC)")).not.toBeInTheDocument();
  });

  it("빈 rows 여도 3개 그룹 헤더는 나온다", () => {
    render(<RollupTable rows={[]} />);
    expect(screen.getByText("WALL · 벽 마감재")).toBeInTheDocument();
    expect(screen.getAllByText("등록된 제품이 없습니다.")).toHaveLength(3);
  });
});
