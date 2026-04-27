import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type Locale = "ko" | "en";

export type ProjectDeliveredProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
  deliverableLinks: Array<{ label: string; url: string }>;
  reviewByDate?: string;
};

const T_EN = {
  eyebrow: "DELIVERED",
  congratulations: "Your project is ready",
  deliverables: "Deliverables:",
  reviewPrompt: "Please review by",
  approve: "Approve",
  requestRevision: "Request revision",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "납품 완료",
  congratulations: "결과물이 도착했습니다",
  deliverables: "납품물:",
  reviewPrompt: "검토 부탁드립니다",
  approve: "승인",
  requestRevision: "수정 요청",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "서울, 대한민국",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#52525b",
  margin: "0 0 16px 0",
};

const bodyStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: 0,
  padding: 0,
};

const containerStyle: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "40px 24px",
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

const metaTextStyle: React.CSSProperties = {
  fontSize: "14px",
  lineHeight: "1.5",
  color: "#52525b",
  margin: "0 0 16px 0",
  wordBreak: "keep-all",
};

const deliverableLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#000000",
  margin: "16px 0 12px 0",
  wordBreak: "keep-all",
};

const deliverableLinkStyle: React.CSSProperties = {
  color: "#000000",
  textDecoration: "underline",
  fontSize: "14px",
  lineHeight: "1.6",
};

const buttonWrapperStyle: React.CSSProperties = {
  marginTop: "24px",
  display: "flex",
  gap: "12px",
  flexWrap: "wrap",
};

const primaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#000000",
  color: "#ffffff",
  borderRadius: "9999px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};

const secondaryButtonStyle: React.CSSProperties = {
  backgroundColor: "#ffffff",
  color: "#000000",
  border: "1px solid #000000",
  borderRadius: "9999px",
  padding: "12px 24px",
  fontSize: "14px",
  fontWeight: 500,
  textDecoration: "none",
  display: "inline-block",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#52525b",
  margin: "4px 0",
};

export function ProjectDelivered({
  projectName,
  locale,
  dashboardUrl,
  deliverableLinks,
  reviewByDate,
}: ProjectDeliveredProps) {
  const T = locale === "ko" ? T_KO : T_EN;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{T.congratulations}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Text style={eyebrowStyle}>{T.eyebrow}</Text>
            <Heading as="h1" style={headingStyle}>
              {T.congratulations}
            </Heading>
            <Text style={bodyTextStyle}>
              {locale === "ko"
                ? "프로젝트의 결과물을 준비했습니다. 아래에서 납품물을 확인하신 후 피드백을 주시기 바랍니다."
                : "Your deliverables are ready. Please review them below and provide any feedback."}
            </Text>

            <Text style={deliverableLabelStyle}>{T.deliverables}</Text>
            {deliverableLinks.map((link, idx) => (
              <Text key={idx} style={{ margin: "8px 0", fontSize: "14px" }}>
                <Link href={link.url} style={deliverableLinkStyle}>
                  {link.label}
                </Link>
              </Text>
            ))}

            {reviewByDate && (
              <Text style={metaTextStyle}>
                <strong>{T.reviewPrompt} {reviewByDate}</strong>
              </Text>
            )}

            <div style={buttonWrapperStyle}>
              <Button href={`${dashboardUrl}?action=approve`} style={primaryButtonStyle}>
                {T.approve}
              </Button>
              <Button href={`${dashboardUrl}?action=revise`} style={secondaryButtonStyle}>
                {T.requestRevision}
              </Button>
            </div>
          </Section>

          <Section style={{ marginTop: "48px" }}>
            <Text style={footerTextStyle}>
              {T.footerTagline} · {T.footerAddress}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

ProjectDelivered.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
  deliverableLinks: [
    { label: "Design Mockups (v1)", url: "https://example.com/mockups" },
    { label: "Brand Guidelines", url: "https://example.com/guidelines" },
  ],
  reviewByDate: "May 15, 2026",
} satisfies ProjectDeliveredProps;

export default ProjectDelivered;
