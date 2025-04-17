import React from 'react'

import 'normalize.css'
import './App.css'

import Layout from './Layout.tsx'
import AddSecretForm from './AddSecretForm.tsx'
import SecretList from './SecretList.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'

import logo from './logo.svg'
import reactLogo from './react.svg'

export default function App() {
  const [secrets, setSecrets] = React.useState([])
  const [onboarding, setOnboarding] = React.useState('secret')
  const [mPassword, setMPassword] = React.useState(null)

  switch (onboarding) {
    case 'secret':
      if (secrets.length > 0) {
        setOnboarding('master')
      }
      break
    case 'master':
      if (mPassword) {
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
      {onboarding === 'secret' && (
        <AddSecretForm
          secretsNumber={secrets.length}
          addSecret={handleAddSecret}
        />
      )}
      {onboarding === 'master' && (
        <MasterPasswordForm setMPassword={setMPassword} />
      )}
      <SecretList secrets={secrets} />
    </Layout>
  )
}
