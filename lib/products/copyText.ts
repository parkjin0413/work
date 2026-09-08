/**
 * 제품 데이터를 복사용 텍스트로 직렬화하는 순수 함수들.
 *  - buildPlainText: 사람이 읽는 평문 블록
 *  - buildJson: 파싱된 Product 객체
 *  - buildClaudeBlock: 평문 앞에 스키마/원본 경로 안내 한 줄
 * (마크다운 원문은 getRawMarkdown() 결과를 그대로 쓴다 — 여기서 만들지 않음)
 */

import { attrsForCategory } from "./attributeSchema";
import { productAttributes, isPresent } from "./attributes";
import type { Product } from "./productsStore";

const EMPTY = "정보 없음";

export function buildPlainText(p: Product): string {
  const lines: string[] = [];
  lines.push(`제품명: ${p.name}`);
  lines.push(`분류: ${p.category} / ${p.productType || EMPTY}`);
  if (p.status !== "active") lines.push(`상태: ${p.status}`);
  if (p.dataNote) lines.push(`확인 필요: ${p.dataNote}`);
  lines.push("");

  lines.push("[요약]");
  lines.push(p.summary || EMPTY);
  lines.push("");

  lines.push("[기본정보]");
  lines.push(
    `소재: ${p.material || EMPTY} / 구조: ${p.structure || EMPTY} / 설치방식: ${
      p.installationSummary || EMPTY
    }`
  );
  lines.push("");

  lines.push("[핵심특징]");
  lines.push(p.highlightFeatures.map((h) => h.title).join(" / ") || EMPTY);
  lines.push("");

  lines.push("[특징]");
  (p.features.length ? p.features : [EMPTY]).forEach((f) => lines.push(`- ${f}`));
  lines.push("");

  lines.push("[타입별 규격]");
  p.types.forEach((t) => {
    const head = t.group ? `[${t.group}] ` : "";
    const parts = [t.typeName, t.sizeWxhxt, t.composition].filter(Boolean);
    if (t.weight) parts.push(t.weight);
    lines.push(`${head}${parts.join(" / ")}`);
  });
  lines.push("");

  const agg = productAttributes(p);
  const defs = attrsForCategory(p.category);
  lines.push(
    "[성능] " +
      defs
        .map((d) => {
          const v = agg[d.key];
          const shown = d.format === "text" ? (isPresent(v) ? String(v) : EMPTY) : isPresent(v) ? "O" : EMPTY;
          return `${d.label}:${shown}`;
        })
        .join(" / ")
  );
  lines.push("");

  lines.push("[색상/디자인]");
  lines.push(
    p.colors.length
      ? p.colors.join(", ")
      : EMPTY + (p.colorsNote ? ` (${p.colorsNote})` : "")
  );
  lines.push("");

  lines.push("[인증]");
  if (p.certifications.length) {
    p.certifications.forEach((c) => {
      const parts = [
        c.body && `기관 ${c.body}`,
        c.standard && `규격 ${c.standard}`,
        c.number && `번호 ${c.number}`,
        c.result && `결과 ${c.result}`,
        c.issued && `발급 ${c.issued}`,
        c.expires && `유효 ~${c.expires}`,
        c.scope && `기준 ${c.scope}`,
        c.note && `(${c.note})`,
      ].filter(Boolean);
      lines.push(`- ${c.name || "(항목명 없음)"}${parts.length ? ` — ${parts.join(" / ")}` : ""}`);
    });
  } else {
    lines.push(EMPTY);
  }
  if (p.certificationsNote) lines.push(`참고: ${p.certificationsNote}`);
  lines.push("");

  lines.push("[설치방법]");
  if (p.installationMethods.length) {
    p.installationMethods.forEach((m) =>
      lines.push(`${m.methodName}: ` + m.steps.map((s) => s.title).join(" → "))
    );
  } else {
    lines.push(`${EMPTY}${p.installationNote ? ` (${p.installationNote})` : ""}`);
  }

  if (p.finishingOptions.length) {
    lines.push("");
    lines.push("[마감 옵션]");
    lines.push(p.finishingOptions.map((f) => f.name).join(", "));
  }

  if (p.body) {
    lines.push("");
    lines.push("[제품 설명]");
    lines.push(p.body);
  }

  return lines.join("\n");
}

export function buildJson(p: Product): string {
  return JSON.stringify(p, null, 2);
}

export function buildClaudeBlock(p: Product): string {
  return (
    `아래는 강산이엔지 제품 데이터입니다. 스키마는 content/products/SCHEMA.md 기준이며, ` +
    `원본 파일은 content/products/${p.categorySlug}/${p.slug}/product.md 입니다.\n\n` +
    buildPlainText(p)
  );
}
