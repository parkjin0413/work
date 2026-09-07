import type { Product } from "@/lib/products/productsStore";
import { attrsForCategory } from "@/lib/products/attributeSchema";
import { aggregateAttributes, isPresent } from "@/lib/products/attributes";

const EMPTY = "정보 없음";

function H({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-3 border-b border-neutral-400 pb-0.5 text-[10.5px] font-bold uppercase tracking-wide text-neutral-600">
      {children}
    </h3>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <td className="border border-neutral-300 px-1.5 py-1 align-top">{children}</td>;
}

/** 인쇄용 단일 제품 데이터시트 — 흑백, 얇은 테두리, 압축 여백. */
export function PrintDatasheet({ product: p }: { product: Product }) {
  const defs = attrsForCategory(p.category);
  const agg = aggregateAttributes(p.category, p.types);
  const perf = defs
    .filter((d) => isPresent(agg[d.key]))
    .map((d) => (d.format === "text" && typeof agg[d.key] === "string" ? `${d.label} ${agg[d.key]}` : d.label));

  return (
    <article className="text-[11px] leading-snug text-black">
      <header className="border-b-2 border-black pb-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
          {p.category} · {p.productType}
          {p.status === "discontinued" ? "  · 단종" : ""}
        </div>
        <h2 className="mt-0.5 text-[15px] font-bold">{p.name}</h2>
        {p.summary ? <p className="mt-1 text-neutral-700">{p.summary}</p> : null}
        <div className="mt-1 text-[10px] text-neutral-600">
          타입: {p.types.map((t) => (t.group ? `${t.group} ${t.typeName}` : t.typeName)).join(" / ")}
        </div>
      </header>

      <H>성능</H>
      <p className="mt-1">{perf.length ? perf.join("  ·  ") : EMPTY}</p>

      <H>기본 정보</H>
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className="w-16 border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-left">소재</th>
            <Cell>{p.material || EMPTY}</Cell>
          </tr>
          <tr>
            <th className="border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-left">구조</th>
            <Cell>{p.structure || EMPTY}</Cell>
          </tr>
          <tr>
            <th className="border border-neutral-300 bg-neutral-100 px-1.5 py-1 text-left">설치</th>
            <Cell>{p.installationSummary || EMPTY}</Cell>
          </tr>
        </tbody>
      </table>

      <H>핵심 특징</H>
      {p.highlightFeatures.length ? (
        <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          {p.highlightFeatures.slice(0, 6).map((h, i) => (
            <li key={i}>· {h.title}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">{EMPTY}</p>
      )}

      <H>특징 상세</H>
      {p.features.length ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {p.features.map((f, i) => (
            <li key={i}>{f}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1">{EMPTY}</p>
      )}

      <H>타입별 규격</H>
      <table className="mt-1 w-full border-collapse break-inside-avoid">
        <thead>
          <tr className="bg-neutral-100 text-left">
            {["그룹", "타입", "두께", "규격 (W×H×T)", "제품구성", "표면", "비고"].map((c) => (
              <th key={c} className="border border-neutral-300 px-1.5 py-1 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.types.map((t, i) => (
            <tr key={i}>
              <Cell>{t.group || "-"}</Cell>
              <Cell>{t.typeName || "-"}</Cell>
              <Cell>{t.thickness || "-"}</Cell>
              <Cell>{t.sizeWxhxt || "-"}</Cell>
              <Cell>{t.composition || "-"}</Cell>
              <Cell>{t.surface || "-"}</Cell>
              <Cell>{t.note || "-"}</Cell>
            </tr>
          ))}
        </tbody>
      </table>

      <H>색상 / 디자인 옵션</H>
      <p className="mt-1">
        {p.colors.length ? p.colors.join(", ") : EMPTY}
        {p.colorsNote ? `  (${p.colorsNote})` : ""}
      </p>

      <H>인증</H>
      {p.certifications.length ? (
        <table className="mt-1 w-full border-collapse break-inside-avoid">
          <thead>
            <tr className="bg-neutral-100 text-left">
              <th className="border border-neutral-300 px-1.5 py-1 font-semibold">항목</th>
              <th className="border border-neutral-300 px-1.5 py-1 font-semibold">시험 규격</th>
              <th className="border border-neutral-300 px-1.5 py-1 font-semibold">결과</th>
            </tr>
          </thead>
          <tbody>
            {p.certifications.map((c, i) => (
              <tr key={i}>
                <Cell>{c.label}</Cell>
                <Cell>{c.standard || "-"}</Cell>
                <Cell>{c.value}</Cell>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-1">{EMPTY}</p>
      )}
      {p.certificationDocuments.length ? (
        <p className="mt-1 text-[10px] text-neutral-600">보유 인증서: {p.certificationDocuments.join(", ")}</p>
      ) : null}
      {p.certificationsNote ? (
        <p className="mt-1 text-[10px] text-neutral-600">참고: {p.certificationsNote}</p>
      ) : null}

      <H>설치 방법</H>
      {p.installationMethods.length ? (
        <div className="mt-1 space-y-1">
          {p.installationMethods.map((m, i) => (
            <p key={i}>
              <span className="font-semibold">{m.methodName}: </span>
              {m.steps.map((s) => `${s.title}(${s.description})`).join(" → ")}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-1">
          {EMPTY}
          {p.installationNote ? `  (${p.installationNote})` : ""}
        </p>
      )}

      {p.finishingOptions.length ? (
        <>
          <H>마감 옵션</H>
          <p className="mt-1">{p.finishingOptions.map((f) => f.name).join(", ")}</p>
        </>
      ) : null}

      {p.body ? (
        <>
          <H>제품 설명</H>
          <p className="mt-1 whitespace-pre-line text-neutral-700">{p.body}</p>
        </>
      ) : null}
    </article>
  );
}
