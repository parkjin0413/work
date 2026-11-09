import { describe, it, expect } from "vitest";
import { buildWeeklyReport, formatReportRange, spreadAcrossWeek, toExcelText } from "./weeklyReport";
import type { WorkItem } from "./workItems";

function item(partial: Partial<WorkItem> & Pick<WorkItem, "id" | "date" | "body">): WorkItem {
  return {
    status: "done",
    projectId: null,
    projectName: null,
    scheduleId: null,
    sortOrder: 0,
    createdAt: `${partial.date}T01:00:00.000Z`,
    ...partial,
  };
}

describe("formatReportRange", () => {
  it("양식처럼 일을 두 자리로 쓴다", () => {
    expect(formatReportRange("2026-11-02")).toBe("11월 02일 - 11월 08일");
  });

  it("달이 바뀌는 주도 처리한다", () => {
    expect(formatReportRange("2026-11-30")).toBe("11월 30일 - 12월 06일");
  });
});

describe("buildWeeklyReport", () => {
  const items = [
    item({ id: "1", date: "2026-11-02", body: "전시회 철거 물품 정리" }),
    item({ id: "2", date: "2026-11-02", body: "전시회 정리\n보고서 작성" }),
    item({ id: "3", date: "2026-11-03", body: "못 한 일", status: "planned" }),
    item({ id: "4", date: "2026-11-09", body: "호스팅 상품 사양 검토", status: "planned" }),
    item({ id: "5", date: "2026-11-09", body: "PHP 버전 설정", status: "planned" }),
  ];

  it("이번 주는 완료 항목만, 번호를 붙이고 줄바꿈은 한 줄로 접는다", () => {
    const report = buildWeeklyReport("2026-11-02", items);

    expect(report.thisWeek).toHaveLength(7);
    expect(report.thisWeek[0]).toMatchObject({
      day: 2,
      weekday: "월",
      lines: ["1. 전시회 철거 물품 정리", "2. 전시회 정리 보고서 작성"],
    });
    expect(report.thisWeek[1].lines).toEqual([]);
    expect(report.thisWeek[6]).toMatchObject({ day: 8, weekday: "일" });
  });

  it("다음 주는 계획 항목을 넣는다", () => {
    const report = buildWeeklyReport("2026-11-02", items);

    expect(report.nextWeekTitle).toBe("11월 09일 - 11월 15일");
    expect(report.nextWeek[0].lines).toEqual(["1. 호스팅 상품 사양 검토", "2. PHP 버전 설정"]);
  });

  it("이번 주에 못 한 계획을 따로 알려준다", () => {
    const report = buildWeeklyReport("2026-11-02", items);

    expect(report.unfinished.map((i) => i.id)).toEqual(["3"]);
  });
});

describe("toExcelText", () => {
  it("머리줄 + 7줄, 6칸이며 여러 줄 셀은 따옴표로 감싼다", () => {
    const report = buildWeeklyReport("2026-11-02", [
      item({ id: "1", date: "2026-11-02", body: "A" }),
      item({ id: "2", date: "2026-11-02", body: '"B" 확인' }),
      item({ id: "3", date: "2026-11-10", body: "C", status: "planned" }),
    ]);

    const rows = toExcelText(report).split("\r\n");

    expect(rows).toHaveLength(8);
    expect(rows[0]).toBe("日\t요일\t11월 02일 - 11월 08일\t日\t요일\t11월 09일 - 11월 15일");
    expect(rows[1]).toBe('2\t월\t"1. A\n2. ""B"" 확인"\t9\t월\t');
    expect(rows[2]).toBe("3\t화\t\t10\t화\t1. C");
    expect(rows[7]).toBe("8\t일\t\t15\t일\t");
  });
});

describe("spreadAcrossWeek", () => {
  const ids = (n: number) => Array.from({ length: n }, (_, i) => `t${i + 1}`);

  it("다음 주 월요일부터 하루 3건씩 나눈다", () => {
    expect(spreadAcrossWeek(ids(7), "2026-11-16")).toEqual([
      { date: "2026-11-16", items: ["t1", "t2", "t3"] },
      { date: "2026-11-17", items: ["t4", "t5", "t6"] },
      { date: "2026-11-18", items: ["t7"] },
    ]);
  });

  it("공휴일은 건너뛴다", () => {
    const groups = spreadAcrossWeek(ids(4), "2026-11-16", { "2026-11-16": ["휴일"] });
    expect(groups.map((g) => g.date)).toEqual(["2026-11-17", "2026-11-18"]);
  });

  it("평일 칸보다 많으면 하루 개수를 늘려 금요일 안에 넣는다", () => {
    const groups = spreadAcrossWeek(ids(17), "2026-11-16");
    expect(groups).toHaveLength(5);
    expect(groups.map((g) => g.items.length)).toEqual([4, 4, 4, 4, 1]);
    expect(groups[4].date).toBe("2026-11-20");
  });

  it("빈 목록은 빈 결과", () => {
    expect(spreadAcrossWeek([], "2026-11-16")).toEqual([]);
  });
});
