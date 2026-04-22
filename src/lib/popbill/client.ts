import "server-only";

export type PopbillMode = "mock" | "test" | "production";

const mode: PopbillMode = ((process.env.POPBILL_MODE ?? "test") as PopbillMode);

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

// ─── Public API ──────────────────────────────────────────────────────────────

export function getPopbillMode(): PopbillMode {
  return mode;
}

export function isPopbillConfigured(): boolean {
  if (mode === "mock") return true;
  return Boolean(
    process.env.POPBILL_LINK_ID &&
    process.env.POPBILL_SECRET_KEY &&
    process.env.POPBILL_CORP_NUM,
  );
}

export async function issueTaxInvoice(args: IssueArgs): Promise<IssueResult> {
  if (mode === "mock") return mockIssueTaxInvoice(args);
  // Phase 2.1 G4 — real SDK paths are deferred to Phase 2.2. Return a
  // structured NOT_IMPLEMENTED result rather than a bare error; callers
  // differentiate on error_code === "NOT_IMPLEMENTED" + the `details`
  // payload to give operators + UI a user-friendly, locale-renderable
  // message and to avoid silent 500s when the invoice issue path is
  // exercised in a non-mock deployment.
  return {
    ok: false,
    error_code: "NOT_IMPLEMENTED",
    error_message: `POPBILL_MODE=${mode} calls to issueTaxInvoice are deferred to Phase 2.2 (real SDK integration pending).`,
    mode,
    details: {
      phase: "2.2",
      mode,
      intent: "issueTaxInvoice",
    },
  };
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
    popbill_mgt_key: `mock-${args.invoice_id}`,
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
