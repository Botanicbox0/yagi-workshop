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

export type ProjectSubmittedAdminProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
  clientName: string;
  workspaceName: string;
  budgetBand?: string;
  deliveryDate?: string;
};

const T_EN = {
  eyebrow: "NEW PROJECT",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "신규 프로젝트",
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
  margin: "0 0 12px 0",
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

const footerTextStyle: React.CSSProperties = {
  fontSize: "12px",
  lineHeight: "1.6",
  color: "#52525b",
  margin: "4px 0",
};

export function ProjectSubmittedAdmin({
  projectName,
  locale,
  dashboardUrl,
  clientName,
  workspaceName,
  budgetBand,
  deliveryDate,
}: ProjectSubmittedAdminProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const headline =
    locale === "ko"
      ? `${clientName} 님이 의뢰를 보냈습니다`
      : `${clientName} submitted ${projectName}`;

  return (
    <Html lang={locale}>
      <Head />
      <Preview>{headline}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Text style={eyebrowStyle}>{T.eyebrow}</Text>
            <Heading as="h1" style={headingStyle}>
              {headline}
            </Heading>
            <Text style={bodyTextStyle}>
              {locale === "ko"
                ? "새 프로젝트가 의뢰되었습니다. 아래 정보를 확인하고 검토를 진행해주세요."
                : "A new project has been submitted. Please review the details below."}
            </Text>

            <Text style={metaTextStyle}>
              <strong>{locale === "ko" ? "프로젝트명: " : "Project: "}</strong>
              {projectName}
            </Text>
            <Text style={metaTextStyle}>
              <strong>{locale === "ko" ? "작업공간: " : "Workspace: "}</strong>
              {workspaceName}
            </Text>
            {budgetBand && (
              <Text style={metaTextStyle}>
                <strong>{locale === "ko" ? "예산대: " : "Budget: "}</strong>
                {budgetBand}
              </Text>
            )}
            {deliveryDate && (
              <Text style={metaTextStyle}>
                <strong>{locale === "ko" ? "납기일: " : "Delivery: "}</strong>
                {deliveryDate}
              </Text>
            )}

            <Button href={dashboardUrl} style={buttonStyle}>
              {locale === "ko" ? "관리자 큐에서 열기" : "Open admin queue"}
            </Button>
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

ProjectSubmittedAdmin.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
  clientName: "Jane Doe",
  workspaceName: "Acme Studios",
  budgetBand: "₩5,000,000 - ₩10,000,000",
  deliveryDate: "2026-05-15",
} satisfies ProjectSubmittedAdminProps;

export default ProjectSubmittedAdmin;
