import React from 'react'

import 'normalize.css'
import './App.css'

import Layout from './Layout.tsx'
import AddSecretForm from './AddSecretForm.tsx'
import StoredSecrets from './StoredSecrets.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'
import UnlockForm from './UnlockForm.tsx'
import SignUpForm from './SignUpForm.tsx'
import ConnectionManager from './ConnectionManager.tsx'
import Footer from './Footer.tsx'
import UuidManager from './UuidManager.tsx'

import {createSecret, getAllSecrets} from '../hooks/secrets.ts'

export default function App() {
  const [secrets, setSecrets] = React.useState([])
  const [onboarding, setOnboarding] = React.useState('secret')
  const [masterPassword, setMasterPassword] = React.useState(null)
  const [showSecretForm, setShowSecretForm] = React.useState(false)
  const [email, setEmail] = React.useState(null)
  const [locked, setLocked] = React.useState(false)

  switch (onboarding) {
    case 'secret':
      if (secrets.length > 0) {
        setOnboarding('master')
      }
      break
    case 'master':
      if (masterPassword) {
        setOnboarding('sign')
      }
      break
    case 'sign':
      if (email) {
        setOnboarding('finished')
      }
      break
    default:
      break
  }

  // ToDo: improve to work after last event
  if (masterPassword && !locked) {
    console.log('Timeout set')
    setTimeout(
      () => {
        console.log('Timeout fired')
        setLocked(true)
      },
      5 * 60 * 1000
    )
  }

  React.useEffect(() => {
    async function setInitSecrets() {
      const pulledSecrets = await getAllSecrets()
      const secrets = []
      if (pulledSecrets) {
        for (const row of pulledSecrets.rows) {
          secrets.push(row.doc)
        }
      }
      setSecrets(secrets)
    }
    setInitSecrets()
  }, [])

  function handleAddSecret(secret: string): void {
    const nextSecret = secret
    setSecrets([nextSecret, ...secrets])
    createSecret(nextSecret)
  }

  return (
    <>
      <ConnectionManager />
      <UuidManager />
      <Layout>
        {locked ?
          <UnlockForm masterPassword={masterPassword} setLocked={setLocked} />
        : <>
            {onboarding === 'sign' && <SignUpForm setEmail={setEmail} />}
            {onboarding === 'master' && (
              <MasterPasswordForm setMasterPassword={setMasterPassword} />
            )}
            {(onboarding === 'secret' || showSecretForm) && (
              <AddSecretForm
                secretsNumber={secrets.length}
                addSecret={handleAddSecret}
                setShowSecretForm={setShowSecretForm}
              />
            )}
            <StoredSecrets
              secrets={secrets}
              showSecretForm={showSecretForm}
              setShowSecretForm={setShowSecretForm}
            />
          </>
        }
      </Layout>
      <Footer />
    </>
  )
}
