import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Text
} from '@react-email/components'
import type {JSX} from 'react'

interface VerificationCodeProps {
  code: string
}

const bodyStyle = {
  fontFamily: 'system-ui, sans-serif',
  backgroundColor: '#ffffff',
  color: '#000000'
}

const containerStyle = {
  maxWidth: '480px',
  margin: '0 auto',
  padding: '32px 24px',
  textAlign: 'center' as const
}

const codeStyle = {
  fontSize: '36px',
  fontWeight: 'bold' as const,
  letterSpacing: '6px',
  margin: '24px 0',
  textAlign: 'center' as const
}

export default function VerificationCode({
  code
}: VerificationCodeProps): JSX.Element {
  return (
    <Html lang='ru'>
      <Head />
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading>Подтверждение почты</Heading>
          <Text>Ваш код:</Text>
          <Text style={codeStyle}>{code}</Text>
          <Text>Код действителен 10 минут.</Text>
        </Container>
      </Body>
    </Html>
  )
}
