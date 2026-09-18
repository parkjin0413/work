"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPartnerAction } from "./actions";

export function CreatePartnerForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [representative, setRepresentative] = useState("");
  const [address, setAddress] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setCompanyName("");
    setRepresentative("");
    setAddress("");
    setBusinessNumber("");
    setPhone("");
    setEmail("");
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!companyName.trim()) return;

    setErrorMessage(null);
    setIsCreating(true);

    try {
      const formData = new FormData();
      formData.set("companyName", companyName);
      formData.set("representative", representative);
      formData.set("address", address);
      formData.set("businessNumber", businessNumber);
      formData.set("phone", phone);
      formData.set("email", email);
      const file = fileInputRef.current?.files?.[0];
      if (file && file.size > 0) {
        formData.set("registrationFile", file);
      }
      await createPartnerAction(formData);
      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "거래처 등록에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
      >
        + 새 거래처 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 md:max-w-md"
    >
      <input
        value={companyName}
        onChange={(e) => setCompanyName(e.target.value)}
        placeholder="회사명"
        aria-label="회사명"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={representative}
        onChange={(e) => setRepresentative(e.target.value)}
        placeholder="대표자"
        aria-label="대표자"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="주소"
        aria-label="주소"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={businessNumber}
        onChange={(e) => setBusinessNumber(e.target.value)}
        placeholder="사업자번호"
        aria-label="사업자번호"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="전화번호"
        aria-label="전화번호"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일"
        aria-label="이메일"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <label className="flex flex-col gap-1 text-xs text-muted">
        사업자등록증 (선택, 이미지 또는 PDF)
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          aria-label="사업자등록증"
          className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground file:mr-2 file:rounded-md file:border-0 file:bg-accent/10 file:px-2 file:py-1 file:text-xs file:text-accent"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isCreating || !companyName.trim()}
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover disabled:opacity-50"
        >
          {isCreating ? "추가 중..." : "등록"}
        </button>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted"
        >
          취소
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-xs text-danger">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
