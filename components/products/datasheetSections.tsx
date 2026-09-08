import type { Product } from "@/lib/products/productsStore";
import { attrsForCategory } from "@/lib/products/attributeSchema";
import { productAttributes, isPresent } from "@/lib/products/attributes";

export const EMPTY = "정보 없음";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </p>
  );
}

export function EmptyBlock({ text = EMPTY }: { text?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs italic text-muted">
      {text}
    </div>
  );
}

export function NoteBlock({ prefix, text }: { prefix: string; text: string }) {
  return (
    <div className="mt-2 rounded border border-border border-l-2 border-l-accent bg-surface-hover px-3 py-2 text-xs text-muted">
      <b className="text-foreground">{prefix} · </b>
      {text}
    </div>
  );
}

function ImgSlot({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-center rounded border border-dashed border-border bg-surface-hover px-2 py-3 text-center font-mono text-[10px] text-muted ${className}`}
    >
      {text}
    </div>
  );
}

/* ── 섹션별 셀 (제품 하나치) ───────────────────────────────── */

export function PerfCell({ product }: { product: Product }) {
  const defs = attrsForCategory(product.category);
  const agg = productAttributes(product);
  // 값이 있는 속성만 배지로 (없는 항목은 굳이 표시하지 않음)
  const present = defs.filter((d) => isPresent(agg[d.key]));
  if (present.length === 0) return <EmptyBlock />;
  return (
    <div className="flex flex-wrap gap-1.5">
      {present.map((d) => {
        const v = agg[d.key];
        const text = d.format === "text" && typeof v === "string" ? v : d.label;
        return (
          <span
            key={d.key}
            className="inline-flex items-center rounded-full border border-accent bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
          >
            {text}
          </span>
        );
      })}
    </div>
  );
}

export function BasicInfoCell({ product }: { product: Product }) {
  const rows: [string, string][] = [
    ["소재", product.material],
    ["구조", product.structure],
    ["설치", product.installationSummary],
  ];
  return (
    <dl className="space-y-1.5 text-[13px]">
      {rows.map(([k, val]) => (
        <div key={k} className="flex gap-2">
          <dt className="w-10 shrink-0 text-[11px] font-medium uppercase text-muted">{k}</dt>
          <dd className="min-w-0 text-foreground">
            {val || <span className="italic text-muted">{EMPTY}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function HighlightsCell({ product }: { product: Product }) {
  if (product.highlightFeatures.length === 0) return <EmptyBlock />;
  return (
    <ul className="space-y-1.5">
      {product.highlightFeatures.slice(0, 6).map((h, i) => (
        <li key={i} className="text-[13px]">
          <span className="font-medium text-foreground">{h.title}</span>
          {h.description ? <span className="block text-xs text-muted">{h.description}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export function FeaturesCell({ product }: { product: Product }) {
  if (product.features.length === 0) return <EmptyBlock />;
  return (
    <ul className="flex flex-col gap-1.5">
      {product.features.map((f, i) => (
        <li
          key={i}
          className="relative pl-4 text-[13px] text-muted before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent"
        >
          {f}
        </li>
      ))}
    </ul>
  );
}

export function TypesCell({ product }: { product: Product }) {
  const cols = ["그룹", "타입", "두께", "규격", "제품구성", "표면", "비고"];
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-surface-hover/60 text-left uppercase tracking-wide text-muted">
            {cols.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1.5 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {product.types.map((t, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-2 py-1.5">{t.group || <span className="text-muted">-</span>}</td>
              <td className="px-2 py-1.5 font-medium text-foreground">{t.typeName || "-"}</td>
              <td className="px-2 py-1.5 font-mono">{t.thickness || "-"}</td>
              <td className="px-2 py-1.5 font-mono">{t.sizeWxhxt || "-"}</td>
              <td className="px-2 py-1.5">{t.composition || "-"}</td>
              <td className="px-2 py-1.5">{t.surface || "-"}</td>
              <td className="px-2 py-1.5">{t.note || <span className="text-muted">-</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ColorsCell({ product }: { product: Product }) {
  if (product.colors.length === 0) {
    return (
      <>
        <EmptyBlock />
        {product.colorsNote ? <NoteBlock prefix="확인 필요" text={product.colorsNote} /> : null}
      </>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {product.colors.map((c, i) => (
        <span
          key={i}
          className="rounded border border-dashed border-border bg-surface-hover px-2 py-0.5 text-xs text-muted"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

/** 인증 1건 — 값이 있는 필드만 label/value 로 나열. */
function CertRow({ cert }: { cert: Product["certifications"][number] }) {
  const rows = (
    [
      ["시험/발급기관", cert.body],
      ["시험 규격", cert.standard],
      ["인증·성적서 번호", cert.number],
      ["결과 / 등급", cert.result],
      ["발급일", cert.issued],
      ["유효기간", cert.expires],
      ["기준", cert.scope],
      ["비고", cert.note],
    ] as [string, string][]
  ).filter(([, v]) => v);

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-[13px] font-semibold text-foreground">{cert.name || "(항목명 없음)"}</p>
      {rows.length ? (
        <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}

export function CertsCell({ product }: { product: Product }) {
  return (
    <div className="space-y-2">
      {product.certifications.length ? (
        <div className="space-y-2">
          {product.certifications.map((c, i) => (
            <CertRow key={i} cert={c} />
          ))}
        </div>
      ) : (
        <EmptyBlock />
      )}
      {product.certificationsNote ? <NoteBlock prefix="참고" text={product.certificationsNote} /> : null}
    </div>
  );
}

export function InstallCell({ product }: { product: Product }) {
  if (product.installationMethods.length === 0) {
    return (
      <>
        <EmptyBlock />
        {product.installationNote ? <NoteBlock prefix="확인 필요" text={product.installationNote} /> : null}
      </>
    );
  }
  return (
    <div className="space-y-3">
      {product.installationMethods.map((m, mi) => (
        <div key={mi}>
          <h5 className="mb-1.5 text-[13px] font-bold text-foreground">{m.methodName}</h5>
          <ol className="space-y-1">
            {m.steps.map((s, si) => (
              <li key={si} className="text-xs text-muted">
                <span className="font-mono font-semibold text-accent">
                  {String(si + 1).padStart(2, "0")}
                </span>{" "}
                <span className="font-medium text-foreground">{s.title}</span> — {s.description}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

export function FinishingCell({ product }: { product: Product }) {
  if (product.finishingOptions.length === 0) return <EmptyBlock />;
  return (
    <div className="grid grid-cols-2 gap-2">
      {product.finishingOptions.map((f, i) => (
        <div key={i} className="rounded-lg border border-border p-2 text-center">
          <ImgSlot text={f.image || "이미지 없음"} />
          <h6 className="mt-1.5 text-xs font-semibold text-foreground">{f.name}</h6>
        </div>
      ))}
    </div>
  );
}

export function ImagesCell({ product }: { product: Product }) {
  if (product.images.length === 0) return <EmptyBlock />;
  return (
    <div className="grid grid-cols-2 gap-2">
      {product.images.map((img, i) => (
        <ImgSlot key={i} text={img} />
      ))}
    </div>
  );
}

export function BodyCell({ product }: { product: Product }) {
  if (!product.body) return <EmptyBlock />;
  return (
    <div className="whitespace-pre-line text-[13px] leading-relaxed text-muted">{product.body}</div>
  );
}

/** 데이터시트 섹션 정의 — 분류 페이지의 항목별 비교 뷰(ProductComparison)에서 사용. */
export const DATASHEET_SECTIONS: {
  key: string;
  label: string;
  Cell: (props: { product: Product }) => JSX.Element;
}[] = [
  { key: "perf", label: "성능", Cell: PerfCell },
  { key: "basic", label: "기본 정보", Cell: BasicInfoCell },
  { key: "highlights", label: "핵심 특징", Cell: HighlightsCell },
  { key: "features", label: "특징 상세", Cell: FeaturesCell },
  { key: "types", label: "타입별 규격", Cell: TypesCell },
  { key: "colors", label: "색상 / 디자인 옵션", Cell: ColorsCell },
  { key: "certs", label: "인증", Cell: CertsCell },
  { key: "install", label: "설치 방법", Cell: InstallCell },
  { key: "finishing", label: "마감 옵션", Cell: FinishingCell },
  { key: "images", label: "이미지 자료 (자리표시자)", Cell: ImagesCell },
  { key: "body", label: "제품 설명", Cell: BodyCell },
];
