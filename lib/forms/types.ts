/**
 * 양식 문서(품의서 · 휴가신청서). dateout 프로젝트의 "양식 문서 작성"을 옮겨온 것이다.
 * 작성자는 나 혼자라 기안자 정보(이름·부서·직급)는 직원명단에서 가져와 문서에 그대로 남긴다.
 */

/** 결재자. 직원명단(employees)에서 고르고, 문서에는 고른 시점의 이름·직급을 함께 남긴다. */
export type FormApprover = {
  order: number;
  /** 직원명단 id. 옮겨온 문서에서 이름이 명단에 없으면 null */
  employeeId: string | null;
  name: string;
  jobTitle: string;
};

/** 결재자 선택 목록 한 줄 */
export type ApproverCandidate = { id: string; name: string; position: string; department: string };

/** 문서에 찍히는 기안자 정보 */
export type DrafterProfile = { name: string; department: string; position: string; phone: string };

// ── 품의서 ──────────────────────────────────────────────

export type ExpenseItem = { description: string; vendor: string; amount: number };

// 증빙 서류는 올리지 않고 인쇄물 뒤에 따로 붙이므로, 붙일 서류 종류만 체크한다 (여러 개 가능).
export const ATTACHMENT_TYPES = [
  "견적서",
  "세금계산서(인보이스)",
  "영수증",
  "카드 매출전표",
  "계좌이체 확인서",
  "결제 페이지 스크린샷",
  "계약서",
] as const;
export type AttachmentType = (typeof ATTACHMENT_TYPES)[number];

export const MAX_EXPENSE_APPROVERS = 4;
export const MAX_CONSULTATIONS = 3;

export type ExpenseReport = {
  id: string;
  docNumber: string;
  drafterName: string;
  drafterPosition: string;
  department: string;
  draftedAt: string;
  title: string;
  content: string;
  items: ExpenseItem[];
  totalAmount: number;
  /** 협의처 부서 이름 (최대 3개) */
  consultations: string[];
  instructions: string;
  attachmentTypes: string[];
  attachmentOther: string;
  approvers: FormApprover[];
  createdAt: string;
};

export type ExpenseReportSummary = Pick<ExpenseReport, "id" | "docNumber" | "title" | "draftedAt" | "totalAmount">;

// ── 휴가신청서 ──────────────────────────────────────────

export const LEAVE_TYPES = [
  "연차",
  "오전반차",
  "오후반차",
  "병가",
  "경조휴가",
  "공가",
  "기타",
  "연차+오전반차",
  "오후반차+연차",
] as const;
export type LeaveRequestType = (typeof LEAVE_TYPES)[number];

/** 0.5일 단위로 0.5 ~ 10일 */
export const LEAVE_DAY_OPTIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 0.5);

export const MAX_LEAVE_APPROVERS = 3;

/** 전체일수 / 전일까지 누계 / 사용일 / 잔여일 — 자동 계산 없이 직접 적는 값 */
export type LeaveBalanceEntry = { total: string; priorUsed: string; used: string; remaining: string };
export type LeaveBalance = { annual: LeaveBalanceEntry; substitute: LeaveBalanceEntry };

export const EMPTY_LEAVE_BALANCE_ENTRY: LeaveBalanceEntry = { total: "", priorUsed: "", used: "", remaining: "" };

export type LeaveRequest = {
  id: string;
  docNumber: string;
  drafterName: string;
  drafterPosition: string;
  department: string;
  draftedAt: string;
  startDate: string;
  endDate: string;
  days: number;
  leaveType: string;
  reason: string;
  substituteJobTitle: string;
  substituteName: string;
  leaveBalance: LeaveBalance;
  approvers: FormApprover[];
  createdAt: string;
};

export type LeaveRequestSummary = Pick<
  LeaveRequest,
  "id" | "docNumber" | "draftedAt" | "startDate" | "endDate" | "days" | "leaveType"
>;
