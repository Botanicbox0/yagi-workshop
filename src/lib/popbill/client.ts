import "server-only";
import { createRequire } from "node:module";

export type PopbillMode = "mock" | "test" | "production";

const POPBILL_ENV_VARIABLES = [
  "POPBILL_MODE",
  "POPBILL_LINK_ID",
  "POPBILL_SECRET_KEY",
  "POPBILL_CORP_NUM",
  "POPBILL_USER_ID",
  "POPBILL_IP_RESTRICT_ON_OFF",
  "POPBILL_USE_STATIC_IP",
  "POPBILL_USE_LOCAL_TIME_YN",
  "POPBILL_LIVE_ISSUE_ENABLED",
] as const;

const mode = resolvePopbillMode(process.env.POPBILL_MODE);

// CRITICAL SAFETY GUARD — must be the very first thing the module does.
// Refuses mock mode in production deploys (per Codex K-05 mock-mode focus #7).
if (mode === "mock" && process.env.NEXT_PUBLIC_VERCEL_ENV === "production") {
  throw new Error(
    "POPBILL_MODE=mock is forbidden in production. Set POPBILL_MODE=production with real credentials."
  );
}

// ─── Types: shared between mock + real ───────────────────────────────────────
// These mirror the 팝빌 Taxinvoice schema fields we send. When the real SDK
// lands, prefer mapping these types onto the SDK's Taxinvoice type rather
// than rewriting every call site.

export type TaxinvoiceLineDetail = {
  serialNum: number;
  purchaseDT: string; // YYYYMMDD
  itemName: string;
  spec: string;
  qty: string;
  unitCost: string;
  supplyCost: string;
  tax: string;
  remark: string;
};

export type Taxinvoice = {
  writeDate: string;          // YYYYMMDD
  chargeDirection: "정과금" | "역과금";
  issueType: "정발행" | "역발행" | "위수탁";
  taxType: "과세" | "영세" | "면세";
  purposeType: "영수" | "청구";

  invoicerCorpNum: string;
  invoicerMgtKey: string;
  invoicerCorpName: string;
  invoicerCEOName: string;
  invoicerAddr: string;
  invoicerBizClass: string;
  invoicerBizType: string;
  invoicerContactName: string;
  invoicerEmail: string;

  invoiceeType: "사업자" | "개인" | "외국인";
  invoiceeCorpNum: string;
  invoiceeCorpName: string;
  invoiceeCEOName: string;
  invoiceeAddr: string;
  invoiceeBizClass: string;
  invoiceeBizType: string;
  invoiceeEmail1: string;

  supplyCostTotal: string;
  taxTotal: string;
  totalAmount: string;
  modifyCode: number | null;

  detailList: TaxinvoiceLineDetail[];
};

export type IssueArgs = {
  invoice_id: string;
  taxinvoice: Taxinvoice;
  memo?: string;
};

export type GetInfoArgs = {
  mgt_key: string;
};

// Phase 2.1 G4 — structured guard metadata for non-implemented Popbill paths.
// Allows the caller's log + UI layers to differentiate "deferred, awaiting
// SDK" from generic 팝빌 API errors without string-matching on error_code.
export type PopbillErrorDetails = {
  phase: string;        // Phase the real path is deferred to (e.g. "2.2").
  mode: PopbillMode;    // Mode at the time of the attempt.
  intent: string;       // The operation that would have been performed.
};

export type IssueResult =
  | {
      ok: true;
      nts_approval_number: string;   // 국세청 승인번호
      popbill_mgt_key: string;
      mode: PopbillMode;
      raw_response: Record<string, unknown>;
    }
  | {
      ok: false;
      error_code: string;
      error_message: string;
      mode: PopbillMode;
      details?: PopbillErrorDetails;
    };

export type TaxInvoiceInfoResult =
  | {
      ok: true;
      mode: PopbillMode;
      nts_approval_number: string;
      raw_response: Record<string, unknown>;
    }
  | {
      ok: false;
      error_code: string;
      error_message: string;
      mode: PopbillMode;
      details?: PopbillErrorDetails;
    };

export type PopbillConfigStatus = {
  mode: PopbillMode;
  configured: boolean;
  missing_variables: string[];
  env_variable_names: typeof POPBILL_ENV_VARIABLES[number][];
  live_issue_enabled: boolean;
  ip_restrict_on_off: boolean;
  use_static_ip: boolean;
  use_local_time_yn: boolean;
};

type PopbillIssueResponse = {
  code?: number | string;
  message?: string;
  ntsConfirmNum?: string;
  [key: string]: unknown;
};

type PopbillTaxInvoiceInfoResponse = {
  ntsConfirmNum?: string;
  ntsconfirmNum?: string;
  itemKey?: string;
  invoiceNum?: string;
  stateCode?: number | string;
  stateDT?: string;
  [key: string]: unknown;
};

type PopbillError = {
  code?: number | string;
  message?: string;
  [key: string]: unknown;
};

type PopbillCallback<T> = (result: T) => void;
type PopbillErrorCallback = (error: PopbillError) => void;

type PopbillTaxinvoiceService = {
  registIssue: (
    corpNum: string,
    taxinvoice: Taxinvoice,
    writeSpecification: boolean,
    forceIssue: boolean,
    memo: string,
    emailSubject: string,
    dealInvoiceMgtKey: string,
    userId: string,
    success: PopbillCallback<PopbillIssueResponse>,
    error: PopbillErrorCallback,
  ) => void;
  getInfo: (
    corpNum: string,
    keyType: "SELL",
    mgtKey: string,
    userId: string,
    success: PopbillCallback<PopbillTaxInvoiceInfoResponse>,
    error: PopbillErrorCallback,
  ) => void;
};

type PopbillModule = {
  config: (config: {
    LinkID: string;
    SecretKey: string;
    IsTest: boolean;
    IPRestrictOnOff: boolean;
    UseStaticIP: boolean;
    UseLocalTimeYN: boolean;
    defaultErrorHandler: (error: PopbillError) => void;
  }) => void;
  TaxinvoiceService: () => PopbillTaxinvoiceService;
};

let taxinvoiceService: PopbillTaxinvoiceService | null = null;

// ─── Public API ──────────────────────────────────────────────────────────────

export function getPopbillMode(): PopbillMode {
  return mode;
}

export function isPopbillConfigured(): boolean {
  return getPopbillConfigStatus().configured;
}

export function getPopbillConfigStatus(): PopbillConfigStatus {
  const required =
    mode === "mock"
      ? []
      : ["POPBILL_LINK_ID", "POPBILL_SECRET_KEY", "POPBILL_CORP_NUM"];
  const missing = required.filter((name) => !process.env[name]);

  return {
    mode,
    configured: missing.length === 0,
    missing_variables: missing,
    env_variable_names: [...POPBILL_ENV_VARIABLES],
    live_issue_enabled: process.env.POPBILL_LIVE_ISSUE_ENABLED === "true",
    ip_restrict_on_off: parseBooleanEnv("POPBILL_IP_RESTRICT_ON_OFF", false),
    use_static_ip: parseBooleanEnv("POPBILL_USE_STATIC_IP", false),
    use_local_time_yn: parseBooleanEnv("POPBILL_USE_LOCAL_TIME_YN", true),
  };
}

export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  if (mode === "mock") return mockIssueTaxInvoice(args);

  const status = getPopbillConfigStatus();
  if (!status.configured) {
    return {
      ok: false,
      error_code: "POPBILL_CONFIG_MISSING",
      error_message: "Popbill server environment variables are incomplete.",
      mode,
    };
  }

  if (mode === "production" && !status.live_issue_enabled) {
    return {
      ok: false,
      error_code: "POPBILL_LIVE_ISSUE_DISABLED",
      error_message: "Production Popbill issue is disabled by guard flag.",
      mode,
    };
  }

  try {
    const result = await callPopbill<PopbillIssueResponse>((success, error) => {
      getTaxinvoiceService().registIssue(
        process.env.POPBILL_CORP_NUM!,
        args.taxinvoice,
        false,
        false,
        args.memo ?? "",
        "",
        "",
        process.env.POPBILL_USER_ID ?? "",
        success,
        error,
      );
    });

    return {
      ok: true,
      mode,
      nts_approval_number: String(result.ntsConfirmNum ?? ""),
      popbill_mgt_key: args.taxinvoice.invoicerMgtKey,
      raw_response: normalizePopbillResponse(result),
    };
  } catch (error) {
    const normalized = normalizePopbillError(error);
    return {
      ok: false,
      error_code: normalized.code,
      error_message: normalized.message,
      mode,
    };
  }
}

export async function getTaxInvoiceInfo(
  args: GetInfoArgs,
): Promise<TaxInvoiceInfoResult> {
  if (mode === "mock") return mockGetTaxInvoiceInfo(args);

  const status = getPopbillConfigStatus();
  if (!status.configured) {
    return {
      ok: false,
      error_code: "POPBILL_CONFIG_MISSING",
      error_message: "Popbill server environment variables are incomplete.",
      mode,
    };
  }

  try {
    const result = await callPopbill<PopbillTaxInvoiceInfoResponse>((success, error) => {
      getTaxinvoiceService().getInfo(
        process.env.POPBILL_CORP_NUM!,
        "SELL",
        args.mgt_key,
        process.env.POPBILL_USER_ID ?? "",
        success,
        error,
      );
    });

    return {
      ok: true,
      mode,
      nts_approval_number: String(
        result.ntsConfirmNum ?? result.ntsconfirmNum ?? "",
      ),
      raw_response: normalizeTaxInvoiceInfoResponse(result),
    };
  } catch (error) {
    const normalized = normalizePopbillError(error);
    return {
      ok: false,
      error_code: normalized.code,
      error_message: normalized.message,
      mode,
    };
  }
}

// ─── Mock implementation ─────────────────────────────────────────────────────

async function mockIssueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  await new Promise((r) => setTimeout(r, 200)); // simulate API latency

  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, "0");

  return {
    ok: true,
    mode: "mock",
    nts_approval_number: `MOCK-${ymd}-${random}`,
    popbill_mgt_key: args.taxinvoice.invoicerMgtKey,
    raw_response: {
      mock: true,
      issued_at: new Date().toISOString(),
      warning: "이 송장은 실제로 국세청에 신고되지 않았습니다.",
      taxinvoice_summary: {
        writeDate: args.taxinvoice.writeDate,
        invoicerCorpNum: args.taxinvoice.invoicerCorpNum,
        invoiceeCorpNum: args.taxinvoice.invoiceeCorpNum,
        totalAmount: args.taxinvoice.totalAmount,
        lineCount: args.taxinvoice.detailList.length,
      },
    },
  };
}

async function mockGetTaxInvoiceInfo(
  args: GetInfoArgs,
): Promise<TaxInvoiceInfoResult> {
  await new Promise((r) => setTimeout(r, 120));

  return {
    ok: true,
    mode: "mock",
    nts_approval_number: `MOCK-LOOKUP-${args.mgt_key.slice(-8).toUpperCase()}`,
    raw_response: {
      mock: true,
      mgt_key: args.mgt_key,
      status: "issued",
      looked_up_at: new Date().toISOString(),
    },
  };
}

// ─── Real SDK adapter ────────────────────────────────────────────────────────

function getTaxinvoiceService(): PopbillTaxinvoiceService {
  if (taxinvoiceService) return taxinvoiceService;

  const require = createRequire(import.meta.url);
  const popbill = require("popbill") as PopbillModule;

  popbill.config({
    LinkID: process.env.POPBILL_LINK_ID!,
    SecretKey: process.env.POPBILL_SECRET_KEY!,
    IsTest: mode === "test",
    IPRestrictOnOff: parseBooleanEnv("POPBILL_IP_RESTRICT_ON_OFF", false),
    UseStaticIP: parseBooleanEnv("POPBILL_USE_STATIC_IP", false),
    UseLocalTimeYN: parseBooleanEnv("POPBILL_USE_LOCAL_TIME_YN", true),
    defaultErrorHandler: (error) => {
      console.error("[popbill] SDK error", normalizePopbillError(error));
    },
  });

  taxinvoiceService = popbill.TaxinvoiceService();
  return taxinvoiceService;
}

function callPopbill<T>(
  invoker: (success: PopbillCallback<T>, error: PopbillErrorCallback) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    invoker(resolve, reject);
  });
}

function resolvePopbillMode(raw: string | undefined): PopbillMode {
  if (raw === "mock" || raw === "test" || raw === "production") return raw;
  return "test";
}

function parseBooleanEnv(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return raw === "true";
}

function normalizePopbillResponse(
  response: PopbillIssueResponse,
): Record<string, unknown> {
  return {
    code: response.code,
    message: response.message,
    ntsConfirmNum: response.ntsConfirmNum,
  };
}

function normalizeTaxInvoiceInfoResponse(
  response: PopbillTaxInvoiceInfoResponse,
): Record<string, unknown> {
  return {
    ntsConfirmNum: response.ntsConfirmNum ?? response.ntsconfirmNum,
    itemKey: response.itemKey,
    invoiceNum: response.invoiceNum,
    stateCode: response.stateCode,
    stateDT: response.stateDT,
  };
}

function normalizePopbillError(error: unknown): { code: string; message: string } {
  if (typeof error === "object" && error !== null) {
    const maybe = error as PopbillError;
    return {
      code: String(maybe.code ?? "POPBILL_ERROR"),
      message: String(maybe.message ?? "Popbill API request failed."),
    };
  }

  return {
    code: "POPBILL_ERROR",
    message: "Popbill API request failed.",
  };
}
