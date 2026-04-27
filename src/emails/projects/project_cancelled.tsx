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

export type ProjectCancelledProps = {
  projectName: string;
  projectId: string;
  locale: Locale;
  dashboardUrl: string;
  cancellerName: string;
  cancellerRole: "client" | "admin";
  comment?: string;
};

const T_EN = {
  eyebrow: "CANCELLED",
  comment: "Comment:",
  footerTagline: "YAGI WORKSHOP",
  footerAddress: "Seoul, Korea",
};

const T_KO = {
  eyebrow: "취소",
  comment: "취소 사유:",
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

export function ProjectCancelled({
  projectName,
  locale,
  dashboardUrl,
  cancellerName,
  cancellerRole,
  comment,
}: ProjectCancelledProps) {
  const T = locale === "ko" ? T_KO : T_EN;
  const headline =
    locale === "ko"
      ? `${projectName} 프로젝트가 취소되었습니다`
      : `${projectName} was cancelled`;

  const roleText =
    locale === "ko"
      ? cancellerRole === "client"
        ? "의뢰처"
        : "관리자"
      : cancellerRole === "client"
        ? "Client"
        : "Administrator";

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
                ? "프로젝트가 취소되었습니다. 자세한 내용은 아래를 확인해주세요."
                : "This project has been cancelled. Please see the details below."}
            </Text>

            <Text style={metaTextStyle}>
              <strong>{locale === "ko" ? "취소자: " : "Cancelled by: "}</strong>
              {cancellerName} ({roleText})
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

ProjectCancelled.PreviewProps = {
  projectName: "Brand Refresh 2026",
  projectId: "00000000-0000-0000-0000-000000000000",
  locale: "en",
  dashboardUrl: "https://studio.yagiworkshop.xyz/app/projects/preview",
  cancellerName: "Jane Doe",
  cancellerRole: "client",
  comment: "The project scope has changed significantly.",
} satisfies ProjectCancelledProps;

export default ProjectCancelled;
