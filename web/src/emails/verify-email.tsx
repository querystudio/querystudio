import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface VerifyEmailProps {
  url: string;
}

export const VerifyEmail = ({ url }: VerifyEmailProps) => (
  <Html>
    <Head />
    <Preview>Verify your email address</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={heading}>Verify your email</Heading>

          <Text style={text}>
            Thanks for signing up! Please verify your email address by clicking the button below.
          </Text>

          <Section style={buttonContainer}>
            <Button href={url} style={button}>
              Verify Email
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footerText}>
            If you didn't create an account, you can safely ignore this email.
          </Text>

          <Text style={linkText}>Or copy and paste this link into your browser:</Text>
          <Text style={urlText}>{url}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#f6f9fc",
  padding: "40px 0",
};

const box = {
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  margin: "0 auto",
  padding: "40px",
  maxWidth: "465px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  textAlign: "center" as const,
  margin: "0 0 24px",
};

const text = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "0 0 32px",
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  padding: "12px 32px",
  display: "inline-block",
};

const divider = {
  borderColor: "#e6e6e6",
  margin: "32px 0",
};

const footerText = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "22px",
  textAlign: "center" as const,
  margin: "0 0 16px",
};

const linkText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0 0 8px",
};

const urlText = {
  color: "#0f172a",
  fontSize: "12px",
  lineHeight: "20px",
  textAlign: "center" as const,
  margin: "0",
  wordBreak: "break-all" as const,
};

export default VerifyEmail;
