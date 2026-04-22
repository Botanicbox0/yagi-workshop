import "server-only";

/**
 * Bilingual (ko/en) HTML + plain-text email renderer for meeting emails.
 *
 * Produces a dark-themed bilingual stacked email matching the Phase 1.3 spec
 * (§E-05). Inline styles only; no external `<style>` tag so it survives mail
 * clients. Korean section is rendered first, followed by a 1px divider and the
 * English section.
 *
 * Security: the summary markdown renderer escapes HTML BEFORE applying any
 * markdown rules, so user-supplied `<script>` etc. is neutered.
 */

export type MeetingEmailKind = "invite" | "cancel" | "summary";

export type MeetingEmailArgs = {
  kind: MeetingEmailKind;
  projectName: string;
  meetingTitle: string;
  scheduledAt: Date;
  durationMinutes: number;
  meetLink?: string;
  organizerName?: string;
  summaryMd?: string;
  cancelReason?: string;
};

export type RenderedEmail = {
  subject: { ko: string; en: string };
  html: string;
  text: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens (dark theme)
// ─────────────────────────────────────────────────────────────────────────────

const TOKENS = {
  bg: "#0A0A0A",
  card: "#111111",
  text: "#FAFAFA",
  secondary: "#D0D0D0",
  accent: "#C8FF8C",
  divider: "#222222",
  footer: "#666666",
} as const;

const FONT_FAMILY =
  "-apple-system,BlinkMacSystemFont,'Pretendard Variable','Apple SD Gothic Neo',sans-serif";

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export function renderMeetingEmail(args: MeetingEmailArgs): RenderedEmail {
  const subject = renderSubject(args);
  const html = renderHtml(args);
  const text = renderText(args);
  return { subject, html, text };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject lines
// ─────────────────────────────────────────────────────────────────────────────

function renderSubject(args: MeetingEmailArgs): { ko: string; en: string } {
  const { kind, projectName } = args;
  switch (kind) {
    case "invite":
      return {
        ko: `[YAGI] ${projectName} · 미팅 초대`,
        en: `[YAGI] ${projectName} · Meeting invite`,
      };
    case "cancel":
      return {
        ko: `[YAGI] ${projectName} · 미팅 취소`,
        en: `[YAGI] ${projectName} · Meeting cancelled`,
      };
    case "summary":
      return {
        ko: `[YAGI] ${projectName} · 미팅 요약`,
        en: `[YAGI] ${projectName} · Meeting summary`,
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/time formatting
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(d: Date, locale: "ko-KR" | "en-US"): string {
  if (locale === "ko-KR") {
    const datePart = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      dateStyle: "long",
      weekday: "short",
    }).format(d);
    const timePart = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      timeStyle: "short",
    }).format(d);
    return `${datePart} ${timePart}`;
  }
  // en-US
  const datePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    dateStyle: "full",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    timeStyle: "short",
  }).format(d);
  return `${datePart} · ${timePart} KST`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML escape (for user-supplied strings rendered into HTML)
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown → HTML (summary body only). Hand-rolled, security-first.
// ─────────────────────────────────────────────────────────────────────────────

function renderSummaryMd(md: string): string {
  // 1. Escape HTML first — the security boundary.
  const escaped = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 2. Apply markdown rules line by line, grouping lists.
  const lines = escaped.split(/\r?\n/);

  const out: string[] = [];
  let i = 0;

  const paraStyle = "margin:0 0 12px;color:#FAFAFA;line-height:1.6;";
  const h1Style = `margin:0 0 12px;color:#FAFAFA;font-size:20px;font-weight:600;line-height:1.3;`;
  const h2Style = `margin:16px 0 8px;color:#FAFAFA;font-size:17px;font-weight:600;line-height:1.3;`;
  const h3Style = `margin:14px 0 6px;color:#FAFAFA;font-size:15px;font-weight:600;line-height:1.3;`;
  const ulStyle = "margin:0 0 12px;padding-left:20px;color:#FAFAFA;line-height:1.6;";
  const olStyle = "margin:0 0 12px;padding-left:20px;color:#FAFAFA;line-height:1.6;";
  const bqStyle =
    "border-left:3px solid #222;padding-left:12px;color:#D0D0D0;margin:0 0 12px;line-height:1.6;";

  const applyInline = (s: string): string =>
    s
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank line → skip
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Headings
    const h3 = /^### (.+)$/.exec(line);
    if (h3) {
      out.push(`<h3 style="${h3Style}">${applyInline(h3[1]!)}</h3>`);
      i += 1;
      continue;
    }
    const h2 = /^## (.+)$/.exec(line);
    if (h2) {
      out.push(`<h2 style="${h2Style}">${applyInline(h2[1]!)}</h2>`);
      i += 1;
      continue;
    }
    const h1 = /^# (.+)$/.exec(line);
    if (h1) {
      out.push(`<h1 style="${h1Style}">${applyInline(h1[1]!)}</h1>`);
      i += 1;
      continue;
    }

    // Unordered list group
    if (/^- /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^- /, "");
        items.push(`<li>${applyInline(content)}</li>`);
        i += 1;
      }
      out.push(`<ul style="${ulStyle}">${items.join("")}</ul>`);
      continue;
    }

    // Ordered list group
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i] ?? "")) {
        const content = (lines[i] ?? "").replace(/^\d+\. /, "");
        items.push(`<li>${applyInline(content)}</li>`);
        i += 1;
      }
      out.push(`<ol style="${olStyle}">${items.join("")}</ol>`);
      continue;
    }

    // Blockquote group
    if (/^> /.test(line)) {
      const parts: string[] = [];
      while (i < lines.length && /^> /.test(lines[i] ?? "")) {
        parts.push((lines[i] ?? "").replace(/^> /, ""));
        i += 1;
      }
      out.push(
        `<blockquote style="${bqStyle}">${applyInline(parts.join("<br />"))}</blockquote>`,
      );
      continue;
    }

    // Paragraph: accumulate until blank line or block marker
    const paraLines: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (
        next.trim() === "" ||
        /^- /.test(next) ||
        /^\d+\. /.test(next) ||
        /^> /.test(next) ||
        /^#{1,3} /.test(next)
      ) {
        break;
      }
      paraLines.push(next);
      i += 1;
    }
    out.push(
      `<p style="${paraStyle}">${applyInline(paraLines.join("<br />"))}</p>`,
    );
  }

  return out.join("");
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML rendering
// ─────────────────────────────────────────────────────────────────────────────

function renderHtml(args: MeetingEmailArgs): string {
  const koSection = renderSection(args, "ko");
  const enSection = renderSection(args, "en");

  const wordmark = `
    <tr>
      <td style="padding:24px 32px 16px;">
        <div style="color:${TOKENS.accent};font-family:${FONT_FAMILY};font-size:14px;font-weight:700;letter-spacing:0.2em;">
          YAGI WORKSHOP
        </div>
      </td>
    </tr>`;

  const divider = `
    <tr>
      <td style="padding:0 32px;">
        <div style="height:1px;background:${TOKENS.divider};line-height:1px;font-size:0;">&nbsp;</div>
      </td>
    </tr>`;

  const footer = `
    <tr>
      <td style="padding:20px 32px 28px;text-align:center;color:${TOKENS.footer};font-family:${FONT_FAMILY};font-size:12px;line-height:1.6;">
        <a href="https://yagiworkshop.xyz" style="color:${TOKENS.accent};text-decoration:none;">yagiworkshop.xyz</a>
      </td>
    </tr>`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:${TOKENS.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${TOKENS.bg};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:${TOKENS.card};border-radius:8px;">
        ${wordmark}
        ${divider}
        <tr>
          <td style="padding:24px 32px;">${koSection}</td>
        </tr>
        ${divider}
        <tr>
          <td style="padding:24px 32px;">${enSection}</td>
        </tr>
        ${divider}
        ${footer}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

type Lang = "ko" | "en";

function renderSection(args: MeetingEmailArgs, lang: Lang): string {
  switch (args.kind) {
    case "invite":
      return renderInviteSection(args, lang);
    case "cancel":
      return renderCancelSection(args, lang);
    case "summary":
      return renderSummarySection(args, lang);
  }
}

// ─ Shared inline styles for HTML sections ──────────────────────────────────

const H1_STYLE = `margin:0 0 12px;color:${TOKENS.text};font-family:${FONT_FAMILY};font-size:20px;font-weight:600;line-height:1.3;`;
const BODY_STYLE = `margin:0 0 12px;color:${TOKENS.text};font-family:${FONT_FAMILY};font-size:14px;line-height:1.6;`;
const DL_LABEL_STYLE = `color:${TOKENS.secondary};font-family:${FONT_FAMILY};font-size:13px;padding:4px 12px 4px 0;vertical-align:top;white-space:nowrap;`;
const DL_VALUE_STYLE = `color:${TOKENS.text};font-family:${FONT_FAMILY};font-size:14px;padding:4px 0;`;
const LINK_STYLE = `color:${TOKENS.accent};text-decoration:underline;`;
const NOTE_STYLE = `margin:12px 0 0;color:${TOKENS.secondary};font-family:${FONT_FAMILY};font-size:13px;line-height:1.6;`;

function renderDetailsTable(rows: Array<[string, string]>): string {
  const body = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="${DL_LABEL_STYLE}">${escapeHtml(label)}</td>
        <td style="${DL_VALUE_STYLE}">${value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 12px;">${body}</table>`;
}

function renderInviteSection(args: MeetingEmailArgs, lang: Lang): string {
  const { projectName, meetingTitle, scheduledAt, durationMinutes, meetLink } =
    args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");

  if (lang === "ko") {
    const rows: Array<[string, string]> = [
      ["제목", escapeHtml(meetingTitle)],
      ["일시", escapeHtml(dt)],
      ["시간", `${durationMinutes}분`],
    ];
    const meetRow = meetLink
      ? `<p style="${BODY_STYLE}">Google Meet 링크: <a href="${escapeHtml(meetLink)}" style="${LINK_STYLE}">${escapeHtml(meetLink)}</a></p>`
      : "";
    return `
      <h1 style="${H1_STYLE}">안녕하세요,</h1>
      <p style="${BODY_STYLE}">${escapeHtml(projectName)} 프로젝트의 미팅 초대를 보내드립니다.</p>
      ${renderDetailsTable(rows)}
      ${meetRow}
      <p style="${NOTE_STYLE}">캘린더 첨부파일을 열어 일정을 확인하실 수 있습니다.</p>
    `;
  }
  const rows: Array<[string, string]> = [
    ["Title", escapeHtml(meetingTitle)],
    ["When", escapeHtml(dt)],
    ["Duration", `${durationMinutes} minutes`],
  ];
  const meetRow = meetLink
    ? `<p style="${BODY_STYLE}">Google Meet link: <a href="${escapeHtml(meetLink)}" style="${LINK_STYLE}">${escapeHtml(meetLink)}</a></p>`
    : "";
  return `
    <h1 style="${H1_STYLE}">Hello,</h1>
    <p style="${BODY_STYLE}">You're invited to a meeting for the ${escapeHtml(projectName)} project.</p>
    ${renderDetailsTable(rows)}
    ${meetRow}
    <p style="${NOTE_STYLE}">Open the attached calendar file to add this to your calendar.</p>
  `;
}

function renderCancelSection(args: MeetingEmailArgs, lang: Lang): string {
  const { meetingTitle, scheduledAt, durationMinutes, cancelReason } = args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");

  if (lang === "ko") {
    const rows: Array<[string, string]> = [
      ["제목", escapeHtml(meetingTitle)],
      ["원래 일시", escapeHtml(dt)],
      ["시간", `${durationMinutes}분`],
    ];
    const reasonRow = cancelReason
      ? `<p style="${BODY_STYLE}">취소 사유: ${escapeHtml(cancelReason)}</p>`
      : "";
    return `
      <h1 style="${H1_STYLE}">미팅이 취소되었습니다.</h1>
      ${renderDetailsTable(rows)}
      ${reasonRow}
    `;
  }
  const rows: Array<[string, string]> = [
    ["Title", escapeHtml(meetingTitle)],
    ["Originally", escapeHtml(dt)],
    ["Duration", `${durationMinutes} minutes`],
  ];
  const reasonRow = cancelReason
    ? `<p style="${BODY_STYLE}">Reason: ${escapeHtml(cancelReason)}</p>`
    : "";
  return `
    <h1 style="${H1_STYLE}">This meeting has been cancelled.</h1>
    ${renderDetailsTable(rows)}
    ${reasonRow}
  `;
}

function renderSummarySection(args: MeetingEmailArgs, lang: Lang): string {
  const { projectName, meetingTitle, scheduledAt, summaryMd } = args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");
  const bodyHtml = summaryMd ? renderSummaryMd(summaryMd) : "";

  const headerStyle = `margin:0 0 16px;color:${TOKENS.secondary};font-family:${FONT_FAMILY};font-size:13px;line-height:1.5;`;

  if (lang === "ko") {
    return `
      <h1 style="${H1_STYLE}">안녕하세요,</h1>
      <p style="${BODY_STYLE}">${escapeHtml(projectName)} 프로젝트의 미팅 요약입니다.</p>
      <p style="${headerStyle}"><strong style="color:${TOKENS.text};">${escapeHtml(meetingTitle)}</strong><br />${escapeHtml(dt)}</p>
      <div style="font-family:${FONT_FAMILY};">${bodyHtml}</div>
    `;
  }
  return `
    <h1 style="${H1_STYLE}">Hello,</h1>
    <p style="${BODY_STYLE}">Here is the summary for the ${escapeHtml(projectName)} meeting.</p>
    <p style="${headerStyle}"><strong style="color:${TOKENS.text};">${escapeHtml(meetingTitle)}</strong><br />${escapeHtml(dt)}</p>
    <div style="font-family:${FONT_FAMILY};">${bodyHtml}</div>
  `;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plain-text rendering (bilingual stacked)
// ─────────────────────────────────────────────────────────────────────────────

const TEXT_SEPARATOR = "─────────";

function renderText(args: MeetingEmailArgs): string {
  const ko = renderTextSection(args, "ko");
  const en = renderTextSection(args, "en");
  return `${ko}\n\n${TEXT_SEPARATOR}\n\n${en}\n\n—\nyagiworkshop.xyz\n`;
}

function renderTextSection(args: MeetingEmailArgs, lang: Lang): string {
  switch (args.kind) {
    case "invite":
      return renderInviteText(args, lang);
    case "cancel":
      return renderCancelText(args, lang);
    case "summary":
      return renderSummaryText(args, lang);
  }
}

function renderInviteText(args: MeetingEmailArgs, lang: Lang): string {
  const { projectName, meetingTitle, scheduledAt, durationMinutes, meetLink } =
    args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");
  if (lang === "ko") {
    const parts = [
      "안녕하세요,",
      "",
      `${projectName} 프로젝트의 미팅 초대를 보내드립니다.`,
      "",
      `제목: ${meetingTitle}`,
      `일시: ${dt}`,
      `시간: ${durationMinutes}분`,
    ];
    if (meetLink) parts.push(`Google Meet 링크: ${meetLink}`);
    parts.push("");
    parts.push("캘린더 첨부파일을 열어 일정을 확인하실 수 있습니다.");
    return parts.join("\n");
  }
  const parts = [
    "Hello,",
    "",
    `You're invited to a meeting for the ${projectName} project.`,
    "",
    `Title: ${meetingTitle}`,
    `When: ${dt}`,
    `Duration: ${durationMinutes} minutes`,
  ];
  if (meetLink) parts.push(`Google Meet link: ${meetLink}`);
  parts.push("");
  parts.push("Open the attached calendar file to add this to your calendar.");
  return parts.join("\n");
}

function renderCancelText(args: MeetingEmailArgs, lang: Lang): string {
  const { meetingTitle, scheduledAt, durationMinutes, cancelReason } = args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");
  if (lang === "ko") {
    const parts = [
      "미팅이 취소되었습니다.",
      "",
      `제목: ${meetingTitle}`,
      `원래 일시: ${dt}`,
      `시간: ${durationMinutes}분`,
    ];
    if (cancelReason) {
      parts.push("");
      parts.push(`취소 사유: ${cancelReason}`);
    }
    return parts.join("\n");
  }
  const parts = [
    "This meeting has been cancelled.",
    "",
    `Title: ${meetingTitle}`,
    `Originally: ${dt}`,
    `Duration: ${durationMinutes} minutes`,
  ];
  if (cancelReason) {
    parts.push("");
    parts.push(`Reason: ${cancelReason}`);
  }
  return parts.join("\n");
}

function renderSummaryText(args: MeetingEmailArgs, lang: Lang): string {
  const { projectName, meetingTitle, scheduledAt, summaryMd } = args;
  const dt = formatDateTime(scheduledAt, lang === "ko" ? "ko-KR" : "en-US");
  const body = summaryMd ?? "";
  if (lang === "ko") {
    return [
      "안녕하세요,",
      "",
      `${projectName} 프로젝트의 미팅 요약입니다.`,
      "",
      `${meetingTitle}`,
      `${dt}`,
      "",
      body,
    ].join("\n");
  }
  return [
    "Hello,",
    "",
    `Here is the summary for the ${projectName} meeting.`,
    "",
    `${meetingTitle}`,
    `${dt}`,
    "",
    body,
  ].join("\n");
}
