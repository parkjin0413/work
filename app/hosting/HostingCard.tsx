"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff, GripVertical, Pencil, Trash2 } from "lucide-react";
import { HOSTING_SECTIONS, type FieldDef, type HostingSite } from "@/lib/hosting/fields";
import type { DragHandleProps } from "./HostingBoard";
import { HostingForm } from "./HostingForm";
import { updateHostingSiteAction, deleteHostingSiteAction } from "./actions";
import { LEVEL_CLASSES, formatDday, siteExpiries } from "./expiry";

const SSL_LABELS: Record<string, string> = { yes: "적용", no: "미적용" };

function toHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function HostingCard({
  site,
  today,
  dragHandleProps,
}: {
  site: HostingSite;
  today: string;
  dragHandleProps?: DragHandleProps;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const { values } = site;
  const siteName = values.siteName;

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopiedKey(key);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedKey(null), 1500);
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleDelete() {
    if (!window.confirm(`"${siteName}" 호스팅 정보를 삭제할까요? 저장된 계정·비밀번호도 함께 삭제됩니다.`)) {
      return;
    }
    setErrorMessage(null);
    setIsDeleting(true);
    try {
      await deleteHostingSiteAction(site.id);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <HostingForm
        initialValues={values}
        submitLabel="저장"
        onSubmit={async (next) => {
          await updateHostingSiteAction(site.id, next);
          setIsEditing(false);
          router.refresh();
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  const expiries = siteExpiries(site, today);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              aria-label={`${siteName} 순서 변경`}
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical size={14} />
            </button>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-foreground">{siteName}</h2>
            {values.siteUrl ? (
              <a
                href={toHref(values.siteUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex max-w-full items-center gap-1 truncate text-xs text-accent hover:underline"
              >
                {values.siteUrl}
                <ExternalLink size={12} className="shrink-0" />
              </a>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${siteName} 수정`}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`${siteName} 삭제`}
            className="rounded-md p-1.5 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* 요약 배지: 호스팅사 / SSL / 만료 D-day */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        {values.hostingProvider ? (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
            {values.hostingProvider}
          </span>
        ) : null}
        {values.sslEnabled ? (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              values.sslEnabled === "yes" ? "bg-success-bg text-success" : "bg-danger-bg text-danger"
            }`}
          >
            SSL {SSL_LABELS[values.sslEnabled]}
          </span>
        ) : null}
        {expiries.map((item) => (
          <span key={item.label} className={`rounded-full px-2 py-0.5 font-medium ${LEVEL_CLASSES[item.level]}`}>
            {item.label} {formatDday(item.daysLeft)}
          </span>
        ))}
      </div>

      {/* 섹션별 상세 */}
      <div className="grid gap-3 sm:grid-cols-2">
        {HOSTING_SECTIONS.filter((section) => section.title !== "기본 정보").map((section) => {
          const filled = section.fields.filter((field) => values[field.key]);
          if (filled.length === 0) return null;
          const wide = section.title === "메모";

          return (
            <section
              key={section.title}
              className={`rounded-xl border border-border bg-bg/50 p-3 ${wide ? "sm:col-span-2" : ""}`}
            >
              <h3 className="mb-1.5 text-xs font-semibold text-accent">{section.title}</h3>
              <dl className="flex flex-col gap-1">
                {filled.map((field) => (
                  <FieldRow
                    key={field.key}
                    field={field}
                    value={values[field.key]}
                    isCopied={copiedKey === field.key}
                    isRevealed={revealed.has(field.key)}
                    onCopy={() => copy(field.key, values[field.key])}
                    onToggleReveal={() => toggleReveal(field.key)}
                  />
                ))}
              </dl>
            </section>
          );
        })}
      </div>

      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function FieldRow({
  field,
  value,
  isCopied,
  isRevealed,
  onCopy,
  onToggleReveal,
}: {
  field: FieldDef;
  value: string;
  isCopied: boolean;
  isRevealed: boolean;
  onCopy: () => void;
  onToggleReveal: () => void;
}) {
  const isPassword = field.type === "password";
  let display = value;
  if (isPassword && !isRevealed) display = "••••••••";
  if (field.type === "ssl") display = SSL_LABELS[value] ?? value;

  return (
    <div className="flex items-start justify-between gap-2 text-sm">
      <dt className="mt-0.5 shrink-0 text-xs text-muted">{field.label}</dt>
      <dd className="flex min-w-0 items-center justify-end gap-1">
        {isCopied ? <span className="shrink-0 text-xs text-accent">복사됨</span> : null}
        <button
          type="button"
          onClick={onCopy}
          title="클릭하여 복사"
          className="min-w-0 whitespace-pre-line break-all rounded px-1 text-right font-medium text-foreground hover:bg-surface-hover"
        >
          {display}
        </button>
        {isPassword ? (
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={isRevealed ? `${field.label} 숨기기` : `${field.label} 보기`}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-hover"
          >
            {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        ) : null}
        {field.type === "url" ? (
          <a
            href={toHref(value)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${field.label} 열기`}
            className="shrink-0 rounded p-1 text-muted hover:bg-surface-hover hover:text-accent"
          >
            <ExternalLink size={13} />
          </a>
        ) : null}
      </dd>
    </div>
  );
}
