import { CERT_STANDARDS, CERT_STANDARDS_INTRO } from "@/lib/products/certStandards";

/**
 * 인증·성능 항목의 국내 기준 요약.
 *  - variant "screen": 대시보드용 카드 목록 (시맨틱 토큰)
 *  - variant "print": 인쇄용 흑백 압축 목록
 */
export function CertStandards({ variant = "screen" }: { variant?: "screen" | "print" }) {
  if (variant === "print") {
    return (
      <div className="text-[9px] leading-tight text-black">
        <p className="mb-1.5 text-neutral-600">{CERT_STANDARDS_INTRO}</p>
        <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {CERT_STANDARDS.map((s) => (
            <div key={s.id} className="break-inside-avoid border-l border-neutral-400 pl-2">
              <dt className="font-bold">{s.term}</dt>
              <dd className="text-neutral-700">
                {s.gist}
                <br />
                <span className="text-neutral-600">근거 </span>
                {s.basis}
                <br />
                <span className="text-neutral-600">시험 </span>
                {s.test}
                {s.criteria ? (
                  <>
                    <br />
                    <span className="text-neutral-600">기준치 </span>
                    {s.criteria}
                  </>
                ) : null}
                <br />
                <span className="text-neutral-600">소관 </span>
                {s.authority}
                {s.note ? (
                  <>
                    <br />
                    <span className="text-neutral-600">참고 </span>
                    {s.note}
                  </>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted">{CERT_STANDARDS_INTRO}</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {CERT_STANDARDS.map((s) => (
          <li key={s.id} className="rounded-xl border border-border bg-surface p-4">
            <p className="text-sm font-semibold text-foreground">{s.term}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.gist}</p>
            <dl className="mt-2 space-y-1 text-[11px] leading-relaxed">
              <Row k="근거" v={s.basis} />
              <Row k="시험" v={s.test} />
              {s.criteria ? <Row k="기준치" v={s.criteria} /> : null}
              <Row k="소관" v={s.authority} />
              {s.note ? <Row k="참고" v={s.note} /> : null}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-10 shrink-0 font-medium text-foreground">{k}</dt>
      <dd className="min-w-0 text-muted">{v}</dd>
    </div>
  );
}
