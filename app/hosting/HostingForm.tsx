"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { HOSTING_SECTIONS, type FieldDef, type HostingValues } from "@/lib/hosting/fields";

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent";

/** 등록·수정에 함께 쓰는 입력 폼. 섹션별로 묶어서 보여준다. */
export function HostingForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: HostingValues;
  submitLabel: string;
  onSubmit: (values: HostingValues) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!values.siteName?.trim()) return;

    setErrorMessage(null);
    setIsSaving(true);
    try {
      await onSubmit(values);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-accent bg-surface p-4"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {HOSTING_SECTIONS.map((section) => (
          <fieldset
            key={section.title}
            className={`flex flex-col gap-2 rounded-xl border border-border p-3 ${
              section.title === "메모" || section.title === "기본 정보" ? "md:col-span-2" : ""
            }`}
          >
            <legend className="px-1 text-xs font-semibold text-accent">{section.title}</legend>
            {section.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key] ?? ""}
                onChange={(value) => setValue(field.key, value)}
              />
            ))}
          </fieldset>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSaving || !values.siteName?.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isSaving ? "저장 중..." : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
        >
          취소
        </button>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const required = field.key === "siteName";

  let control;
  if (field.type === "textarea") {
    control = (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
        rows={2}
        className={INPUT_CLASS}
      />
    );
  } else if (field.type === "ssl") {
    control = (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={field.label}
        className={INPUT_CLASS}
      >
        <option value="">미확인</option>
        <option value="yes">적용 (https)</option>
        <option value="no">미적용</option>
      </select>
    );
  } else if (field.type === "password") {
    control = (
      <div className="flex items-center gap-1">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={field.label}
          autoComplete="new-password"
          className={INPUT_CLASS}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          aria-label={showPassword ? `${field.label} 숨기기` : `${field.label} 보기`}
          className="shrink-0 rounded-md p-1.5 text-muted hover:bg-bg"
        >
          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    );
  } else {
    control = (
      <input
        type={field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        aria-label={field.label}
        autoComplete="off"
        className={INPUT_CLASS}
      />
    );
  }

  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      <span>
        {field.label}
        {required ? <span className="text-danger"> *</span> : null}
      </span>
      {control}
    </label>
  );
}
