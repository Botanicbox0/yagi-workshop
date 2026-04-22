import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type Locale = "ko" | "en";
type DigestPeriod = "hourly" | "daily";

type DigestEvent = {
  kind: string;
  title: string;
  body: string;
  url_path: string;
  created_at: string;
};

export type NotificationDigestProps = {
  locale: Locale;
  events: DigestEvent[];
  recipientEmail: string;
  unsubscribeUrl: string;
  siteUrl: string;
  digestPeriod: DigestPeriod;
};

const T_EN = {
  headingN: (n: number) => `${n} updates from YAGI Workshop`,
  periodHourly: "Hourly digest",
  periodDaily: "Daily digest",
  open: "Open",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
  sentTo: "This email was sent to",
  unsubscribe: "Unsubscribe from these emails",
  manageSettings: "Manage notification settings",
};

const T_KO = {
  headingN: (n: number) => `YAGI Workshop의 업데이트 ${n}건`,
  periodHourly: "시간별 디지스트",
  periodDaily: "데일리 디지스트",
  open: "열기",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "서울, 대한민국",
  sentTo: "이 이메일은 다음 주소로 발송되었습니다",
  unsubscribe: "이메일 수신 거부",
  manageSettings: "알림 설정 관리",
};

function formatTimestamp(iso: string, locale: Locale): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// === styles (inline only) ===
const bodyStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 24px",
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: 'Fraunces, Georgia, "Times New Roman", serif',
  fontStyle: "italic",
  fontWeight: 400,
  fontSize: "20px",
  letterSpacing: "0.02em",
  color: "#000000",
  margin: 0,
  padding: 0,
};

const periodLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#666666",
  margin: "24px 0 4px 0",
};

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: "1.35",
  fontWeight: 600,
  color: "#000000",
  margin: "0 0 24px 0",
  wordBreak: "keep-all",
};

const rowStyle: React.CSSProperties = {
  borderTop: "1px solid #e5e5e5",
  padding: "16px 0",
};

const rowTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: "1.4",
  color: "#000000",
  margin: "0 0 4px 0",
  wordBreak: "keep-all",
};

const rowBodyStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.55",
  color: "#333333",
  margin: "0 0 6px 0",
  wordBreak: "keep-all",
};

const rowMetaStyle: React.CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  margin: 0,
};

const rowLinkStyle: React.CSSProperties = {
  color: "#000000",
  textDecoration: "none",
  display: "block",
};

const hrStyle: React.CSSProperties = {
  borderColor: "#e5e5e5",
  margin: "40px 0 24px 0",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#666666",
  margin: "4px 0",
};

const footerLinkStyle: React.CSSProperties = {
  color: "#000000",
  textDecoration: "underline",
};

export function NotificationDigest({
  locale,
  events,
  recipientEmail,
  unsubscribeUrl,
  siteUrl,
  digestPeriod,
}: NotificationDigestProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const firstTitle = events[0]?.title ?? "";
  const preview = firstTitle.slice(0, 50);
  const periodLabel =
    digestPeriod === "hourly" ? T.periodHourly : T.periodDaily;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Text style={wordmarkStyle}>YAGI WORKSHOP</Text>
          </Section>

          <Section>
            <Text style={periodLabelStyle}>{periodLabel}</Text>
            <Heading as="h1" style={headingStyle}>
              {T.headingN(events.length)}
            </Heading>
          </Section>

          <Section>
            {events.map((ev, idx) => {
              const href = `${siteUrl}${ev.url_path || "/"}`;
              return (
                <div key={`${ev.kind}-${idx}`} style={rowStyle}>
                  <Link href={href} style={rowLinkStyle}>
                    <Text style={rowTitleStyle}>{ev.title}</Text>
                    <Text style={rowBodyStyle}>{ev.body}</Text>
                    <Text style={rowMetaStyle}>
                      {formatTimestamp(ev.created_at, locale)}
                    </Text>
                  </Link>
                </div>
              );
            })}
          </Section>

          <Hr style={hrStyle} />

          <Section>
            <Text style={footerTextStyle}>
              {T.footerTagline} · {T.footerAddress}
            </Text>
            <Text style={footerTextStyle}>
              {T.sentTo} {recipientEmail}.
            </Text>
            <Text style={footerTextStyle}>
              <Link href={unsubscribeUrl} style={footerLinkStyle}>
                {T.unsubscribe}
              </Link>
              {"  ·  "}
              <Link
                href={`${siteUrl}/${locale}/app/settings/notifications`}
                style={footerLinkStyle}
              >
                {T.manageSettings}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

NotificationDigest.PreviewProps = {
  locale: "en",
  digestPeriod: "hourly",
  events: [
    {
      kind: "frame_uploaded_batch",
      title: "3 new frames uploaded",
      body: "3 new frames added to \"Summer Campaign Board\".",
      url_path: "/en/app/preprod/preview-board",
      created_at: new Date().toISOString(),
    },
    {
      kind: "feedback_received",
      title: "New feedback received",
      body: "2 reactions on \"Summer Campaign Board\".",
      url_path: "/en/app/preprod/preview-board",
      created_at: new Date().toISOString(),
    },
  ],
  recipientEmail: "preview@example.com",
  unsubscribeUrl: "https://studio.yagiworkshop.xyz/unsubscribe/preview-token",
  siteUrl: "https://studio.yagiworkshop.xyz",
} satisfies NotificationDigestProps;

export default NotificationDigest;
