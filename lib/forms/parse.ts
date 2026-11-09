import { isValidISODate } from "@/lib/schedule/calendar";
import {
  ATTACHMENT_TYPES,
  LEAVE_TYPES,
  MAX_CONSULTATIONS,
  type ExpenseItem,
  type LeaveBalance,
  type LeaveBalanceEntry,
} from "./types";

/** 폼 입력을 검사한 결과. 실패하면 화면에 보여줄 문구를 돌려준다. */
export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** approver_1, approver_2 … 순서대로 고른 결재자 id (빈 칸은 건너뛴다) */
export function readApproverIds(formData: FormData, max: number): Parsed<string[]> {
  const ids = Array.from({ length: max }, (_, i) => text(formData, `approver_${i + 1}`)).filter(Boolean);
  if (ids.length === 0) return { ok: false, error: "결재자를 1명 이상 지정해주세요." };
  if (new Set(ids).size !== ids.length) return { ok: false, error: "결재자를 중복 없이 지정해주세요." };
  return { ok: true, value: ids };
}

// ── 품의서 ──────────────────────────────────────────────

export type ExpenseFields = {
  draftedAt: string;
  title: string;
  content: string;
  items: ExpenseItem[];
  totalAmount: number;
  consultations: string[];
  instructions: string;
  attachmentTypes: string[];
  attachmentOther: string;
};

/** 지출 항목: 완전히 빈 줄만 건너뛴다. 품목·금액 중 하나만 있거나 금액이 숫자가 아니면 알려준다 (0원은 허용). */
function readItems(formData: FormData): Parsed<ExpenseItem[]> {
  const descriptions = formData.getAll("item_description").map(String);
  const vendors = formData.getAll("item_vendor").map(String);
  const amounts = formData.getAll("item_amount").map(String);

  const items: ExpenseItem[] = [];
  for (let i = 0; i < descriptions.length; i += 1) {
    const description = descriptions[i].trim();
    const vendor = (vendors[i] ?? "").trim();
    const rawAmount = (amounts[i] ?? "").replace(/[,\s]/g, "");
    if (!description && !vendor && !rawAmount) continue;
    if (!description) return { ok: false, error: `${i + 1}번 지출 항목의 품목을 입력해주세요.` };
    const amount = Number(rawAmount);
    if (!/^\d+$/.test(rawAmount) || !Number.isSafeInteger(amount)) {
      return { ok: false, error: `${i + 1}번 지출 항목의 금액을 확인해주세요.` };
    }
    items.push({ description, vendor, amount });
  }
  return { ok: true, value: items };
}

export function parseExpenseFields(formData: FormData): Parsed<ExpenseFields> {
  const draftedAt = text(formData, "drafted_at");
  if (!isValidISODate(draftedAt)) return { ok: false, error: "기안일을 입력해주세요." };

  const title = text(formData, "title");
  if (!title) return { ok: false, error: "제목을 입력해주세요." };

  const content = text(formData, "content");
  if (!content) return { ok: false, error: "내용을 입력해주세요." };

  const read = readItems(formData);
  if (!read.ok) return read;
  const items = read.value;
  if (items.length === 0) return { ok: false, error: "지출 항목을 1건 이상 입력해주세요." };

  const consultations = formData
    .getAll("consultation_department")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, MAX_CONSULTATIONS);
  const checked = formData.getAll("attachment_types").map(String);

  return {
    ok: true,
    value: {
      draftedAt,
      title,
      content,
      items,
      totalAmount: items.reduce((sum, item) => sum + item.amount, 0),
      consultations,
      instructions: text(formData, "instructions"),
      attachmentTypes: ATTACHMENT_TYPES.filter((type) => checked.includes(type)),
      attachmentOther: text(formData, "attachment_other"),
    },
  };
}

// ── 휴가신청서 ──────────────────────────────────────────

export type LeaveFields = {
  draftedAt: string;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: string;
  reason: string;
  substituteJobTitle: string;
  substituteName: string;
  leaveBalance: LeaveBalance;
};

function readBalanceEntry(formData: FormData, prefix: string): LeaveBalanceEntry {
  return {
    total: text(formData, `${prefix}_total`),
    priorUsed: text(formData, `${prefix}_prior`),
    used: text(formData, `${prefix}_used`),
    remaining: text(formData, `${prefix}_remaining`),
  };
}

export function parseLeaveFields(formData: FormData): Parsed<LeaveFields> {
  const draftedAt = text(formData, "drafted_at");
  if (!isValidISODate(draftedAt)) return { ok: false, error: "기안일을 입력해주세요." };

  const startDate = text(formData, "start_date");
  const endDate = text(formData, "end_date");
  if (!isValidISODate(startDate) || !isValidISODate(endDate)) return { ok: false, error: "휴가기간을 입력해주세요." };
  if (endDate < startDate) return { ok: false, error: "휴가 종료일은 시작일보다 빠를 수 없습니다." };

  const days = Number(text(formData, "days"));
  if (!Number.isFinite(days) || days <= 0) return { ok: false, error: "신청일수를 선택해주세요." };
  if (startDate === endDate && days > 1) {
    return { ok: false, error: "휴가기간이 하루인데 신청일수가 1일을 넘을 수 없습니다." };
  }
  if (startDate !== endDate && days <= 0.5) {
    return { ok: false, error: "휴가기간이 여러 날인데 신청일수가 0.5일일 수 없습니다." };
  }

  const leaveType = text(formData, "leave_type");
  if (!(LEAVE_TYPES as readonly string[]).includes(leaveType)) return { ok: false, error: "휴가종류를 선택해주세요." };

  const reason = text(formData, "reason");
  if (!reason) return { ok: false, error: "휴가 사유를 입력해주세요." };

  return {
    ok: true,
    value: {
      draftedAt,
      startDate,
      endDate,
      days,
      leaveType,
      reason,
      substituteJobTitle: text(formData, "substitute_job_title"),
      substituteName: text(formData, "substitute_name"),
      leaveBalance: {
        annual: readBalanceEntry(formData, "balance_annual"),
        substitute: readBalanceEntry(formData, "balance_substitute"),
      },
    },
  };
}
