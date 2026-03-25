/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

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
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to My Glove Brand — Verify your email to get started</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={headerSection}>
          <Text style={brandName}>MY GLOVE BRAND</Text>
          <Text style={brandSub}>Wholesale Portal</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Welcome to the Portal</Heading>
        <Text style={text}>
          Thanks for creating your wholesale account! You're one step away from
          designing and ordering custom gloves.
        </Text>
        <Text style={text}>
          Please verify your email address ({recipient}) by clicking the button below:
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Verify Email &amp; Get Started
          </Button>
        </Section>
        <Text style={footer}>
          If you didn't create an account, you can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '40px 30px', maxWidth: '480px', margin: '0 auto' }
const headerSection = { textAlign: 'center' as const, marginBottom: '10px' }
const brandName = {
  fontSize: '20px',
  fontWeight: '700' as const,
  color: '#1a1a1a',
  letterSpacing: '2px',
  margin: '0',
}
const brandSub = {
  fontSize: '12px',
  color: '#c9a84c',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '4px 0 0',
}
const divider = { borderColor: '#e5e5e5', margin: '20px 0 30px' }
const h1 = {
  fontSize: '22px',
  fontWeight: '600' as const,
  color: '#1a1a1a',
  margin: '0 0 16px',
}
const text = {
  fontSize: '14px',
  color: '#555555',
  lineHeight: '1.6',
  margin: '0 0 20px',
}
const buttonContainer = { textAlign: 'center' as const, margin: '30px 0' }
const button = {
  backgroundColor: '#c9a84c',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '6px',
  padding: '14px 28px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
