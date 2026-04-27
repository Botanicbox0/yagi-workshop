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

export type ProjectSubmittedClientProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
};

const T_EN = {
  eyebrow: "RECEIVED",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "접수 완료",
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

export function ProjectSubmittedClient({
  projectName,
  locale,
  dashboardUrl,
}: ProjectSubmittedClientProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const headline =
    locale === "ko"
      ? "의뢰를 잘 받았습니다"
      : "We received your project";
  const body =
    locale === "ko"
      ? "1 영업일 이내에 검토 후 회신드립니다. 의뢰하신 프로젝트를 확인하려면 아래 버튼을 눌러주세요."
      : "We will review and get back to you within 1 business day. Click below to view your project.";

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
            <Text style={bodyTextStyle}>{body}</Text>

            <Button href={dashboardUrl} style={buttonStyle}>
              {locale === "ko" ? "프로젝트 확인" : "View project"}
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

ProjectSubmittedClient.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
} satisfies ProjectSubmittedClientProps;

export default ProjectSubmittedClient;
