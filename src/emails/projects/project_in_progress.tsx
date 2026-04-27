import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type Locale = "ko" | "en";

export type ProjectInProgressProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
  directorName?: string;
};

const T_EN = {
  eyebrow: "IN PROGRESS",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "진행 중",
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

export function ProjectInProgress({
  projectName,
  locale,
  dashboardUrl,
  directorName,
}: ProjectInProgressProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const headline =
    locale === "ko"
      ? "프로젝트가 시작되었습니다"
      : "Your project is now in progress";

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
                ? "프로젝트 제작이 본격적으로 시작되었습니다. 진행 상황은 대시보드에서 실시간으로 확인하실 수 있습니다."
                : "Your project is now in active development. You can track progress in real-time on your dashboard."}
            </Text>

            {directorName && (
              <Text style={metaTextStyle}>
                <strong>{locale === "ko" ? "담당 감독: " : "Your director: "}</strong>
                {directorName}
              </Text>
            )}

            <Button href={dashboardUrl} style={buttonStyle}>
              {locale === "ko" ? "프로젝트 보기" : "View project"}
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

ProjectInProgress.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
  directorName: "John Smith",
} satisfies ProjectInProgressProps;

export default ProjectInProgress;
