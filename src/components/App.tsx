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

const INACTIVITY_TIMEOUT = 2 * 6 * 1000
const LOCKED_STORAGE_KEY = 'app_locked'

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App(): JSX.Element {
  const [secrets, setSecrets] = React.useState<Secret[]>([])
  const [onboarding, setOnboarding] = React.useState<OnboardingStage>('secret')
  const [showSecretForm, setShowSecretForm] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState<string | null>(null)
  const [locked, setLocked] = React.useState<boolean>(() => {
    // Initialize locked state from localStorage
    return localStorage.getItem(LOCKED_STORAGE_KEY) === 'true'
  })

  const lockTimerRef = React.useRef<number | null>(null)

  /**
   * Clear existing lock timer
   */
  const clearLockTimer = React.useCallback(() => {
    if (lockTimerRef.current) {
      window.clearTimeout(lockTimerRef.current)
      lockTimerRef.current = null
    }
  }, [])

  /**
   * Start or restart the inactivity timer
   */
  const startLockTimer = React.useCallback(() => {
    clearLockTimer()

    // Only set timer if user is authenticated and not locked
    if ((onboarding === 'sign' || onboarding === 'finished') && !locked) {
      console.log('Starting inactivity timer')
      lockTimerRef.current = window.setTimeout(() => {
        console.log('Inactivity timeout - locking application')
        setLocked(true)
      }, INACTIVITY_TIMEOUT)
    }
  }, [onboarding, locked, clearLockTimer])

  /**
   * Handle user activity to reset lock timer
   */
  const handleUserActivity = React.useCallback(() => {
    startLockTimer()
  }, [startLockTimer])

  /**
   * Handle unlocking the application
   */
  const handleUnlock = React.useCallback(() => {
    setLocked(false)
  }, [])

  /**
   * Sync locked state with localStorage
   */
  React.useEffect(() => {
    if (locked) {
      localStorage.setItem(LOCKED_STORAGE_KEY, 'true')
      clearLockTimer() // Clear timer when locked
    } else {
      localStorage.removeItem(LOCKED_STORAGE_KEY)
      startLockTimer() // Start timer when unlocked
    }
  }, [locked, clearLockTimer, startLockTimer])

  /**
   * Set up user activity listeners
   */
  React.useEffect(() => {
    const activityEvents = [
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'mousemove'
    ]

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleUserActivity, {passive: true})
    })

    // Start initial timer
    startLockTimer()

    // Cleanup function
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleUserActivity)
      })
      clearLockTimer()
    }
  }, [handleUserActivity, startLockTimer, clearLockTimer])

  /**
   * Update onboarding stage based on secrets count
   */
  React.useEffect(() => {
    if (onboarding === 'secret' && secrets.length > 0) {
      setOnboarding('master')
    }
  }, [secrets.length, onboarding])

  /**
   * Load initial data on mount
   */
  React.useEffect(() => {
    async function loadInitialData() {
      try {
        // Load secrets
        const secretsResult = await getAllSecrets()
        if (secretsResult.success && secretsResult.data) {
          setSecrets(secretsResult.data)
        }

        // Check if master password exists
        const masterPasswordResult = await hasMasterPassword()
        if (masterPasswordResult.success) {
          setOnboarding('sign')
        }

        // Load email
        const emailResult = await getEmail()
        if (emailResult.success && emailResult.data.email) {
          setOnboarding('finished')
          setEmail(emailResult.data.email)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadInitialData()
  }, [])

  /**
   * Handle adding a new secret
   * @param {Secret} secret - New secret to add
   */
  const handleAddSecret = React.useCallback(
    async (secret: Secret): Promise<void> => {
      // Optimistically update UI
      setSecrets((prevSecrets) => [secret, ...prevSecrets])

      try {
        const result = await createSecret(secret)

        if (!result.success) {
          console.error('Failed to save secret:', result.error)
          // Revert optimistic update
          setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))
          // TODO: Show error notification to user
        }
      } catch (error) {
        console.error('Error creating secret:', error)
        // Revert optimistic update
        setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))
      }
    },
    []
  )

  /**
   * Handle setting master password
   */
  const handleMasterPassword = React.useCallback(
    async (masterPassword: string) => {
      try {
        await storeMasterPassword(masterPassword)
        setOnboarding('sign')
      } catch (error) {
        console.error('Error storing master password:', error)
        // TODO: Show error notification to user
      }
    },
    []
  )

  /**
   * Handle email signup
   */
  const handleEmail = React.useCallback(async (email: string) => {
    try {
      await createUserAccount(email)
      setOnboarding('finished')
      setEmail(email)
    } catch (error) {
      console.error('Error creating user account:', error)
      // TODO: Show error notification to user
    }
  }, [])

  return (
    <div className='flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      {!locked && <Header email={email} />}
      <Layout>
        {locked ?
          <UnlockForm setLocked={handleUnlock} />
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
