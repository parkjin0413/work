"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import type { Partner } from "@/lib/partners/partnersStore";
import type { DragHandleProps } from "./PartnersBoard";
import { updatePartnerAction, deletePartnerAction } from "./actions";
import { PartnerFilePreview } from "./PartnerFilePreview";

type FieldKey = "companyName" | "representative" | "address" | "businessNumber" | "phone" | "email";

const FIELD_LABELS: Record<Exclude<FieldKey, "companyName">, string> = {
  representative: "대표자",
  address: "주소",
  businessNumber: "사업자번호",
  phone: "전화번호",
  email: "이메일",
};

const DIGITS_ONLY_FIELDS: FieldKey[] = ["businessNumber", "phone"];

function toCopyValue(field: FieldKey, value: string): string {
  return DIGITS_ONLY_FIELDS.includes(field) ? value.replace(/[^0-9]/g, "") : value;
}

export function PartnerCard({
  partner,
  dragHandleProps,
}: {
  partner: Partner;
  dragHandleProps?: DragHandleProps;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<FieldKey | null>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editCompanyName, setEditCompanyName] = useState(partner.companyName);
  const [editRepresentative, setEditRepresentative] = useState(partner.representative ?? "");
  const [editAddress, setEditAddress] = useState(partner.address ?? "");
  const [editBusinessNumber, setEditBusinessNumber] = useState(partner.businessNumber ?? "");
  const [editPhone, setEditPhone] = useState(partner.phone ?? "");
  const [editEmail, setEditEmail] = useState(partner.email ?? "");
  const [removeExistingFile, setRemoveExistingFile] = useState(false);

  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  async function copyToClipboard(field: FieldKey, rawValue: string) {
    try {
      await navigator.clipboard.writeText(toCopyValue(field, rawValue));
    } catch {
      return;
    }

    setCopiedField(field);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopiedField(null), 1500);
  }

  function resetEditFields() {
    setEditCompanyName(partner.companyName);
    setEditRepresentative(partner.representative ?? "");
    setEditAddress(partner.address ?? "");
    setEditBusinessNumber(partner.businessNumber ?? "");
    setEditPhone(partner.phone ?? "");
    setEditEmail(partner.email ?? "");
    setRemoveExistingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setErrorMessage(null);
  }

  async function handleSave() {
    setErrorMessage(null);
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.set("id", partner.id);
      formData.set("companyName", editCompanyName);
      formData.set("representative", editRepresentative);
      formData.set("address", editAddress);
      formData.set("businessNumber", editBusinessNumber);
      formData.set("phone", editPhone);
      formData.set("email", editEmail);
      formData.set("removeRegistrationFile", removeExistingFile ? "true" : "false");
      const file = fileInputRef.current?.files?.[0];
      if (file && file.size > 0) {
        formData.set("registrationFile", file);
      }
      await updatePartnerAction(formData);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "수정에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setErrorMessage(null);
    setIsDeleting(true);

    try {
      await deletePartnerAction(partner.id);
      router.refresh();
    } catch {
      setErrorMessage("삭제에 실패했습니다.");
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-accent bg-surface p-4">
        <input
          value={editCompanyName}
          onChange={(e) => setEditCompanyName(e.target.value)}
          aria-label="회사명"
          placeholder="회사명"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editRepresentative}
          onChange={(e) => setEditRepresentative(e.target.value)}
          aria-label="대표자"
          placeholder="대표자"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editAddress}
          onChange={(e) => setEditAddress(e.target.value)}
          aria-label="주소"
          placeholder="주소"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editBusinessNumber}
          onChange={(e) => setEditBusinessNumber(e.target.value)}
          aria-label="사업자번호"
          placeholder="사업자번호"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editPhone}
          onChange={(e) => setEditPhone(e.target.value)}
          aria-label="전화번호"
          placeholder="전화번호"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />
        <input
          value={editEmail}
          onChange={(e) => setEditEmail(e.target.value)}
          aria-label="이메일"
          placeholder="이메일"
          className="rounded-lg border border-border bg-bg px-2 py-1 text-sm text-foreground"
        />

        <label className="flex flex-col gap-1 text-xs text-muted">
          사업자등록증 (선택, 이미지 또는 PDF)
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            aria-label="사업자등록증 교체"
            className="rounded-lg border border-border bg-bg px-2 py-1 text-xs text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-accent/10 file:px-2 file:py-1 file:text-xs file:text-accent"
          />
        </label>
        {partner.registrationFileName ? (
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={removeExistingFile}
              onChange={(e) => setRemoveExistingFile(e.target.checked)}
            />
            등록된 사업자등록증 삭제 ({partner.registrationFileName})
          </label>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editCompanyName.trim()}
            className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          <button
            type="button"
            onClick={() => {
              resetEditFields();
              setIsEditing(false);
            }}
            className="rounded-md border border-border px-2 py-1 text-xs text-muted"
          >
            취소
          </button>
        </div>
        {errorMessage ? (
          <p role="alert" className="text-xs text-danger">
            {errorMessage}
          </p>
        ) : null}
      </div>
    );
  }

  const fields: { key: Exclude<FieldKey, "companyName">; value: string | null }[] = [
    { key: "representative", value: partner.representative },
    { key: "address", value: partner.address },
    { key: "businessNumber", value: partner.businessNumber },
    { key: "phone", value: partner.phone },
    { key: "email", value: partner.email },
  ];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          {dragHandleProps ? (
            <button
              type="button"
              aria-label={`${partner.companyName} 순서 변경`}
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded-md p-1 text-muted hover:bg-bg active:cursor-grabbing"
              {...dragHandleProps.attributes}
              {...dragHandleProps.listeners}
            >
              <GripVertical size={14} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => copyToClipboard("companyName", partner.companyName)}
            title="클릭하여 복사"
            className="min-w-0 truncate rounded px-1 text-left text-base font-semibold text-foreground hover:bg-bg"
          >
            {partner.companyName}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            aria-label={`${partner.companyName} 수정`}
            className="rounded-md p-1.5 text-muted hover:bg-bg hover:text-foreground"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label={`${partner.companyName} 삭제`}
            className="rounded-md p-1.5 text-danger hover:bg-bg disabled:opacity-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {copiedField === "companyName" ? (
        <p role="status" className="text-right text-xs text-accent">
          복사되었습니다
        </p>
      ) : null}

      {fields.map(({ key, value }) =>
        value ? (
          <div key={key}>
            <div className="flex items-start justify-between gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-muted">{FIELD_LABELS[key]}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(key, value)}
                title="클릭하여 복사"
                className="min-w-0 whitespace-normal break-words rounded px-1 text-right font-medium text-foreground hover:bg-bg"
              >
                {value}
              </button>
            </div>
            {copiedField === key ? (
              <p role="status" className="text-right text-xs text-accent">
                복사되었습니다
              </p>
            ) : null}
          </div>
        ) : null
      )}

      {partner.registrationFileUrl ? (
        <PartnerFilePreview
          fileUrl={partner.registrationFileUrl}
          downloadUrl={partner.registrationFileDownloadUrl}
          fileName={partner.registrationFileName}
          companyName={partner.companyName}
        />
      ) : null}

      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
