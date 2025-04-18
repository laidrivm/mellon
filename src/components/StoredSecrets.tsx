import {ReactNode} from 'react'

import Button from './Button.tsx'
import Secret from './Secret.tsx'

export default function StoredSecrets({
  secrets,
  showSecretForm,
  setShowSecretForm
}: {
  secrets: [any]
  showSecretForm: boolean
  setShowSecretForm: (showSecretForm: boolean) => void
}): ReactNode {
  function onClick(): void {
    setShowSecretForm(true)
  }

  return (
    <div className='mt-12'>
      <div className='flex justify-between'>
        <h2 className='text-3xl'>Stored Secrets</h2>

        {secrets.length !== 0 && !showSecretForm && (
          <Button inline={true} onClick={onClick}>
            Add New
          </Button>
        )}
      </div>

      {secrets.length === 0 ?
        <p className='text-md mt-2'>No stored secrets yet</p>
      : <ul className='mt-4 space-y-4'>
          {secrets.map((secret, index) => (
            <Secret secret={secret} key={index} />
          ))}
        </ul>
      }
    </div>
  )
}
