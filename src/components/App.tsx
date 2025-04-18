import React from 'react'

import 'normalize.css'
import './App.css'

import Layout from './Layout.tsx'
import AddSecretForm from './AddSecretForm.tsx'
import StoredSecrets from './StoredSecrets.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'

import logo from './logo.svg'
import reactLogo from './react.svg'

export default function App() {
  const [secrets, setSecrets] = React.useState([])
  const [onboarding, setOnboarding] = React.useState('secret')
  const [masterPassword, setMasterPassword] = React.useState(null)
  const [showSecretForm, setShowSecretForm] = React.useState(false)

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
    default:
      break
  }

  function handleAddSecret(secret: string): void {
    setSecrets([...secrets, secret])
  }

  return (
    <Layout>
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
    </Layout>
  )
}
