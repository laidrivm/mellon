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

import {createSecret, getAllSecrets} from '../services/secrets.ts'
import {OnboardingStage, Secret} from '../types.ts'

const INACTIVITY_TIMEOUT = 5 * 60 * 1000

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App(): JSX.Element {
  const [secrets, setSecrets] = React.useState<Secret[]>([])
  const [onboarding, setOnboarding] = React.useState<OnboardingStage>('secret')
  const [masterPassword, setMasterPassword] = React.useState<string | null>(
    null
  )
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

    if (masterPassword && !locked) {
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
    if (!masterPassword) return

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
  }, [masterPassword, locked]) // Only run when these values change

  /**
   * Update onboarding stage based on state changes
   */
  React.useEffect(() => {
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
  }, [secrets.length, masterPassword, email, onboarding])

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
   * Handle adding a new secret
   * @param {Secret} secret - New secret to add
   */
  const handleAddSecret = async (secret: Secret): Promise<void> => {
    setSecrets((prevSecrets) => [secret, ...prevSecrets])

    const result = await createSecret(secret)

    if (!result.success) {
      console.error('Failed to save secret:', result.error)

      setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))

      // TODO: Show error notification to user
    }
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
