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

export type ProjectApprovedProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
  approverName: string;
  comment?: string;
};

const T_EN = {
  eyebrow: "APPROVED",
  comment: "Comment:",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "승인 완료",
  comment: "코멘트:",
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

const commentLabelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#000000",
  margin: "16px 0 12px 0",
};

const commentBoxStyle: React.CSSProperties = {
  backgroundColor: "#fafafa",
  border: "1px solid #e4e4e7",
  borderRadius: "6px",
  padding: "16px",
  fontSize: "14px",
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

export function ProjectApproved({
  projectName,
  locale,
  dashboardUrl,
  approverName,
  comment,
}: ProjectApprovedProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const headline =
    locale === "ko"
      ? `${approverName} 님이 프로젝트를 승인했습니다`
      : `${approverName} approved ${projectName}`;

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
                ? "축하합니다! 프로젝트가 승인되었습니다. 진행 내역은 대시보드에서 확인하실 수 있습니다."
                : "Congratulations! Your project has been approved. You can view all details on your dashboard."}
            </Text>

            {comment && (
              <>
                <Text style={commentLabelStyle}>{T.comment}</Text>
                <div style={commentBoxStyle}>{comment}</div>
              </>
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

ProjectApproved.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
  approverName: "John Smith",
  comment: "Great work! The design aligns perfectly with the brand strategy.",
} satisfies ProjectApprovedProps;

export default ProjectApproved;
