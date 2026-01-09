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

interface WaitlistStatusProps {
  status: 'approved' | 'rejected'
}

export const WaitlistStatus = ({ status }: WaitlistStatusProps) => {
  const isApproved = status === 'approved'

  return (
    <Html>
      <Head />
      <Preview>
        {isApproved
          ? "You've been approved for QueryStudio!"
          : 'Update on your QueryStudio waitlist request'}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>
              {isApproved ? "You're in! 🎉" : 'Waitlist Update'}
            </Heading>

            {isApproved ? (
              <>
                <Text style={text}>
                  Great news! Your request to join QueryStudio has been approved.
                  You can now create your account and start exploring your
                  databases with our modern, AI-powered studio.
                </Text>

                <Text style={text}>
                  Click the button below to get started and set up your account.
                </Text>

                <Section style={buttonContainer}>
                  <Button href="https://querystudio.dev/signup" style={button}>
                    Create Your Account
                  </Button>
                </Section>
              </>
            ) : (
              <>
                <Text style={text}>
                  Thank you for your interest in QueryStudio. Unfortunately, we're
                  unable to approve your waitlist request at this time.
                </Text>

                <Text style={text}>
                  We're currently in a limited beta and can only accept a small
                  number of users. Please feel free to apply again in the future.
                </Text>

                <Section style={buttonContainer}>
                  <Button href="https://querystudio.dev" style={buttonOutline}>
                    Visit QueryStudio
                  </Button>
                </Section>
              </>
            )}

            <Hr style={divider} />

            <Text style={footerText}>
              {isApproved
                ? "We're excited to have you on board!"
                : 'Thank you for understanding.'}
            </Text>

            <Text style={footerText}>— The QueryStudio Team</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

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

const buttonOutline = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6e6e6',
  borderRadius: '6px',
  color: '#0f172a',
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

export default WaitlistStatus
