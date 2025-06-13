import React from 'react'

import Button from './Button.tsx'
import SecretItem from './SecretItem.tsx'

import type {StoredSecretsProps} from '../types.ts'

export default function StoredSecrets({
  secrets,
  showSecretForm,
  handleSetShowSecretForm
}: StoredSecretsProps): JSX.Element {
  function onClick(): void {
    handleSetShowSecretForm(true)
  }

  return (
    <div className='mt-12'>
      <div className='flex justify-between'>
        <h2 className='text-3xl'>Stored Secrets</h2>

        {secrets.length !== 0 && !showSecretForm && (
          <Button style='inline' onClick={onClick}>
            Add New
          </Button>
        )}
      </div>

      {secrets.length === 0 ?
        <p className='text-md mt-2'>No stored secrets yet</p>
      : <ul className='mt-4 space-y-4'>
          {secrets.map((secret, index) => (
            <SecretItem secret={secret} key={index} />
          ))}
        </ul>
      }
    </div>
  )
}
