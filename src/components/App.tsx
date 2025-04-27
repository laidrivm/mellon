import React from 'react'

import 'normalize.css'
import './App.css'

import Layout from './Layout.tsx'
import AddSecretForm from './AddSecretForm.tsx'
import StoredSecrets from './StoredSecrets.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'
import UnlockForm from './UnlockForm.tsx'
import SignUpForm from './SignUpForm.tsx'
import Header from './Header.tsx'
import Footer from './Footer.tsx'

import {createSecret, getAllSecrets} from '../services/secrets.ts'
import {
  storeMasterPassword,
  hasMasterPassword,
  getEmail,
  createUserAccount
} from '../services/users.ts'
import {OnboardingStage, Secret} from '../types.ts'

const INACTIVITY_TIMEOUT = 2 * 60 * 1000

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App(): JSX.Element {
  const [secrets, setSecrets] = React.useState<Secret[]>([])
  const [onboarding, setOnboarding] = React.useState<OnboardingStage>('secret')
  const [showSecretForm, setShowSecretForm] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState<string | null>(null)
  const [locked, setLocked] = React.useState<boolean>(false)
  const [lockTimer, setLockTimer] = React.useState<number | null>(null)

  /**
   * Reset inactivity timer
   */
  const resetLockTimer = () => {
    // Clear existing timer
    if (lockTimer) {
      window.clearTimeout(lockTimer)
    }

    console.log(`resetLockTimer, onboarding: ${onboarding}, locked: ${locked}`)

    if ((onboarding === 'sign' || onboarding === 'finished') && !locked) {
      const timerId = window.setTimeout(() => {
        console.log('Inactivity timeout - locking application')
        setLocked(true)
      }, INACTIVITY_TIMEOUT)

      setLockTimer(timerId)
    }
  }

  /**
   * Handle user activity to reset lock timer
   */
  React.useEffect(() => {
    // Reset timer on mount
    resetLockTimer()

    // Event listeners for user activity
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart']

    const handleUserActivity = () => {
      resetLockTimer()
    }

    activityEvents.forEach((event) => {
      document.addEventListener(event, handleUserActivity)
    })

    // Clean up
    return () => {
      if (lockTimer) {
        window.clearTimeout(lockTimer)
      }

      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleUserActivity)
      })
    }
  }, [locked, onboarding]) // Only run when these values change

  /**
   * Update onboarding stage based on state changes
   */
  React.useEffect(() => {
    if (onboarding === 'secret' && secrets.length > 0) {
      setOnboarding('master')
    }
  }, [secrets.length])

  /**
   * Load secrets from database on mount
   */
  React.useEffect(() => {
    async function loadInitialSecrets() {
      const result = await getAllSecrets()

      if (result.success && result.data) {
        setSecrets(result.data)
      }
    }

    loadInitialSecrets()
  }, [])

  /**
   * Load Master Password from database on mount
   */
  React.useEffect(() => {
    async function loadMasterPassword() {
      const result = await hasMasterPassword()

      if (result.success) {
        setOnboarding('sign')
      }
    }

    loadMasterPassword()
  }, [])

  /**
   * Load Master Password from database on mount
   */
  React.useEffect(() => {
    async function loadEmail() {
      const result = await getEmail()

      if (result.success && result.data.email) {
        setOnboarding('finished')
        setEmail(result.data.email)
      }
    }

    loadEmail()
  }, [])

  /**
   * Handle adding a new secret
   * @param {Secret} secret - New secret to add
   */
  async function handleAddSecret(secret: Secret): Promise<void> {
    setSecrets((prevSecrets) => [secret, ...prevSecrets])

    const result = await createSecret(secret)

    if (!result.success) {
      console.error('Failed to save secret:', result.error)

      setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))

      // TODO: Show error notification to user
    }
  }

  async function handleMasterPassword(masterPassword: MasterPassword) {
    await storeMasterPassword(masterPassword)
    setOnboarding('sign')
  }

  async function handleEmail(email: string) {
    await createUserAccount(email)
    setOnboarding('finished')
    setEmail(email)
  }

  return (
    <div className='flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      {!locked && <Header email={email} />}
      <Layout>
        {locked ?
          <UnlockForm setLocked={setLocked} />
        : <>
            {onboarding === 'sign' && <SignUpForm addEmail={handleEmail} />}
            {onboarding === 'master' && (
              <MasterPasswordForm addMasterPassword={handleMasterPassword} />
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
    </div>
  )
}
