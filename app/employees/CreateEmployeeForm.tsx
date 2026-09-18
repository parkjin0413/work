"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createEmployeeAction } from "./actions";

export function CreateEmployeeForm({
  departmentId,
  partners,
}: {
  departmentId: string;
  partners: { id: string; companyName: string }[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [birthdayCalendar, setBirthdayCalendar] = useState<"solar" | "lunar">("solar");
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setPosition("");
    setStatusNote("");
    setPartnerId("");
    setWorkLocation("");
    setPhone("");
    setBirthdayMonth("");
    setBirthdayDay("");
    setBirthdayCalendar("solar");
    setErrorMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;

    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createEmployeeAction({
        departmentId,
        name,
        position,
        statusNote,
        partnerId,
        workLocation,
        phone,
        birthdayMonth,
        birthdayDay,
        birthdayCalendar,
      });
      resetForm();
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "직원 등록에 실패했습니다.");
    } finally {
      setIsCreating(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
      >
        + 직원 추가
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 md:max-w-md"
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="이름"
        aria-label="이름"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={position}
        onChange={(e) => setPosition(e.target.value)}
        placeholder="직급"
        aria-label="직급"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={statusNote}
        onChange={(e) => setStatusNote(e.target.value)}
        placeholder="상태 표시 (선택, 예: 육아휴직)"
        aria-label="상태 표시"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <select
        value={partnerId}
        onChange={(e) => setPartnerId(e.target.value)}
        aria-label="소속"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="">소속 없음</option>
        {partners.map((partner) => (
          <option key={partner.id} value={partner.id}>
            {partner.companyName}
          </option>
        ))}
      </select>
      <input
        value={workLocation}
        onChange={(e) => setWorkLocation(e.target.value)}
        placeholder="근무지 (예: 창동 본사)"
        aria-label="근무지"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />
      <input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="전화번호"
        aria-label="전화번호"
        className="rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
      />

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={birthdayMonth}
          onChange={(e) => setBirthdayMonth(e.target.value)}
          placeholder="생일 월"
          aria-label="생일 월"
          inputMode="numeric"
          className="w-20 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <input
          value={birthdayDay}
          onChange={(e) => setBirthdayDay(e.target.value)}
          placeholder="생일 일"
          aria-label="생일 일"
          inputMode="numeric"
          className="w-20 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <label className="flex items-center gap-1 text-xs text-muted">
          <input
            type="radio"
            name="birthdayCalendar"
            checked={birthdayCalendar === "solar"}
            onChange={() => setBirthdayCalendar("solar")}
          />
          양력
        </label>
        <label className="flex items-center gap-1 text-xs text-muted">
          <input
            type="radio"
            name="birthdayCalendar"
            checked={birthdayCalendar === "lunar"}
            onChange={() => setBirthdayCalendar("lunar")}
          />
          음력
        </label>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isCreating || !name.trim()}
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
