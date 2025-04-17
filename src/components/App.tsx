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
  const hasSecrets = secrets.length > 0

  function handleAddSecret(secret: string): void {
    setSecrets([...secrets, secret])
  }

  return (
    <Layout>
      {hasSecrets ?
        <MasterPasswordForm />
      : <AddSecretForm onAdd={handleAddSecret} />}
      <SecretList secrets={secrets} />
    </Layout>
  )
}
