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
} from '@react-email/components'

export const WaitlistJoined = () => (
  <Html>
    <Head />
    <Preview>You're on the QueryStudio waitlist!</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={box}>
          <Heading style={heading}>You're on the list! 🎉</Heading>

          <Text style={text}>
            Thanks for joining the QueryStudio waitlist. We're working hard to
            bring you a beautiful, modern database studio.
          </Text>

          <Text style={text}>
            You'll be among the first to know when we launch. We'll send you an
            email with early access as soon as it's ready.
          </Text>

          <Section style={buttonContainer}>
            <Button href="https://querystudio.dev" style={button}>
              Visit QueryStudio
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={footerText}>
            In the meantime, follow us for updates and sneak peeks of what's
            coming.
          </Text>

          <Text style={footerText}>— The QueryStudio Team</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container = {
  backgroundColor: '#f6f9fc',
  padding: '40px 0',
}

const box = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '0 auto',
  padding: '40px',
  maxWidth: '465px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
}

const heading = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  textAlign: 'center' as const,
  margin: '0 0 24px',
}

const text = {
  color: '#525f7f',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
  margin: '0 0 20px',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  backgroundColor: '#0f172a',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  padding: '12px 32px',
  display: 'inline-block',
}

const divider = {
  borderColor: '#e6e6e6',
  margin: '32px 0',
}

const footerText = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '22px',
  textAlign: 'center' as const,
  margin: '0 0 8px',
}

export default WaitlistJoined
