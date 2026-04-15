import React, {type JSX} from 'react'
import Button from './Button.tsx'
import SingleInputForm from './SingleInputForm.tsx'

const RESEND_COOLDOWN_SEC = 30

interface CodeFormProps {
  email: string
  handleCode: (code: string) => void
  handleResend: () => Promise<{success: boolean; error?: string}>
  formError?: string | null
}

export default function CodeForm({
  email,
  handleCode,
  handleResend,
  formError
}: CodeFormProps): JSX.Element {
  const [cooldown, setCooldown] = React.useState(0)
  const [status, setStatus] = React.useState<
    {kind: 'sent'} | {kind: 'error'; message: string} | null
  >(null)

  React.useEffect(() => {
    if (cooldown <= 0) return
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const onResend = async (): Promise<void> => {
    if (cooldown > 0) return
    setStatus(null)
    const res = await handleResend()
    if (res.success) {
      setStatus({kind: 'sent'})
      setCooldown(RESEND_COOLDOWN_SEC)
    } else {
      setStatus({kind: 'error', message: res.error ?? 'Failed to resend code'})
    }
  }

  const label = cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'

  return (
    <div className='space-y-4'>
      <SingleInputForm
        title='Verify Email'
        description={`We sent a code to ${email}. Please copy paste it here:`}
        inputLabel='Code'
        buttonLabel='Verify'
        onSubmit={handleCode}
        formError={formError}
      />
      <div className='flex flex-col items-start space-y-2'>
        <Button
          type='button'
          style='secondary'
          onClick={onResend}
          disabled={cooldown > 0}
        >
          {label}
        </Button>
        {status?.kind === 'sent' && (
          <div className='text-md text-gray-600'>Code sent.</div>
        )}
        {status?.kind === 'error' && (
          <div className='text-md text-red-500'>{status.message}</div>
        )}
      </div>
    </div>
  )
}
