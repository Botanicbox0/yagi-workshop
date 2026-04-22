import {
  Body,
  Button,
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

type ImmediateEvent = {
  kind: string;
  title: string;
  body: string;
  url_path: string;
};

export type NotificationImmediateProps = {
  locale: Locale;
  event: ImmediateEvent;
  recipientEmail: string;
  unsubscribeUrl: string;
  siteUrl: string;
};

const T_EN = {
  openButton: "Open in YAGI Workshop",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
  sentTo: "This email was sent to",
  unsubscribe: "Unsubscribe from these emails",
  manageSettings: "Manage notification settings",
};

const T_KO = {
  openButton: "YAGI Workshop에서 열기",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "서울, 대한민국",
  sentTo: "이 이메일은 다음 주소로 발송되었습니다",
  unsubscribe: "이메일 수신 거부",
  manageSettings: "알림 설정 관리",
};

// === styles (inline only — React Email convention) ===
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

const headingStyle: React.CSSProperties = {
  fontSize: "22px",
  lineHeight: "1.35",
  fontWeight: 600,
  color: "#000000",
  margin: "32px 0 12px 0",
  wordBreak: "keep-all",
};

const bodyTextStyle: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: "1.6",
  color: "#000000",
  margin: "0 0 24px 0",
  wordBreak: "keep-all",
};

const buttonStyle: React.CSSProperties = {
  backgroundColor: "#000000",
  color: "#ffffff",
  borderRadius: "9999px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
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

export function NotificationImmediate({
  locale,
  event,
  recipientEmail,
  unsubscribeUrl,
  siteUrl,
}: NotificationImmediateProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const preview = (event.title || "").slice(0, 50);
  const href = `${siteUrl}${event.url_path || "/"}`;

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
            <Heading as="h1" style={headingStyle}>
              {event.title}
            </Heading>
            <Text style={bodyTextStyle}>{event.body}</Text>

            <Button href={href} style={buttonStyle}>
              {T.openButton}
            </Button>
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

NotificationImmediate.PreviewProps = {
  locale: "en",
  event: {
    kind: "meeting_scheduled",
    title: "New meeting scheduled",
    body: "Yagi scheduled \"Kickoff\" for Apr 24, 10:00 KST.",
    url_path: "/en/app/meetings/preview",
  },
  recipientEmail: "preview@example.com",
  unsubscribeUrl: "https://studio.yagiworkshop.xyz/unsubscribe/preview-token",
  siteUrl: "https://studio.yagiworkshop.xyz",
} satisfies NotificationImmediateProps;

export default NotificationImmediate;
