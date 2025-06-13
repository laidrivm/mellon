import React from 'react'

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
  existsLocalUser,
  createLocalUser,
  getOnboardingStage,
  updateOnboardingStage,
  storeMasterPassword,
  hasMasterPassword,
  getEmail,
  createUserAccount,
  verifyMasterPassword
} from '../services/users.ts'
import {clearEncryptionCache} from '../services/encryption.ts'
import {OnboardingStage, Secret} from '../types.ts'

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App(): JSX.Element {
  const [onboarding, setOnboarding] =
    React.useState<OnboardingStage>('finished')
  const [secrets, setSecrets] = React.useState<Secret[]>([])
  const [showSecretForm, setShowSecretForm] = React.useState<boolean>(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [failedSecretData, setFailedSecretData] = React.useState<Secret | null>(
    null
  )

  async function saveOnboardingStage(stage: OnboardingStage): void {
    setOnboarding(stage)
    await updateOnboardingStage(stage)
  }

  function showSecretsError(errorMessage: string, secret: Secret): void {
    setFormError(errorMessage)
    setFailedSecretData(secret)
    setShowSecretForm(true)
  }

  /**
   * Handle adding a new secret
   * @param {Secret} secret - New secret to add
   */
  const addSecret = React.useCallback(
    async (secret: Secret): Promise<void> => {
      setFormError(null)
      setFailedSecretData(null)
      setSecrets((prevSecrets) => [secret, ...prevSecrets])

      if (onboarding === 'secret') {
        await saveOnboardingStage('master') // no failure check
      }

      const result = await createSecret(secret)

      // Revert optimistic update and show error if failed to save a secret
      if (!result.success) {
        setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))
        showSecretsError(result.error, secret)
      }
    },
    [onboarding]
  )

  // Clear error when form is closed
  const handleSetShowSecretForm = React.useCallback((show: boolean) => {
    setShowSecretForm(show)
    if (!show) {
      setFormError(null)
      setFailedSecretData(null)
    }
  }, [])

  /**
   * Load initial data on mount
   */
  React.useEffect(() => {
    async function loadInitialData() {
      if (!(await existsLocalUser())) {
        await createLocalUser()
      }
      setOnboarding(await getOnboardingStage())
    }

    loadInitialData()
  }, [])

  /**
   * TODO: Verify if password is valid
   */
  const handleUnlock = React.useCallback(
    async (masterPasswordCandidate: string) => {
      try {
        const result = await verifyMasterPassword(masterPasswordCandidate)
        if (result) {
          setLocked(false)
          // Mark session as active when unlocking
          sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
          // Reload secrets now that encryption is available
          const secretsResult = await getAllSecrets()
          if (secretsResult.success && secretsResult.data) {
            setSecrets(secretsResult.data)
          }
        }
      } catch (error) {
        console.error('Error during unlock:', error)
      }
    },
    []
  )

  return (
    <div className='flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      <Layout>
        {onboarding === 'secret' || showSecretForm ?
          <AddSecretForm
            onboarding={onboarding}
            addSecret={addSecret}
            handleSetShowSecretForm={handleSetShowSecretForm}
            formError={formError}
            initialData={failedSecretData}
          />
        : <UnlockForm tryUnlock={handleUnlock} />}
        <StoredSecrets
          secrets={secrets}
          showSecretForm={showSecretForm}
          handleSetShowSecretForm={handleSetShowSecretForm}
        />
      </Layout>
      <Footer />
    </div>
  )
}

// ---------------------------------------------------------------------------------------------------
// refactoring line ----------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------------------

const INACTIVITY_TIMEOUT = 2 * 2 * 1000 // 2 minutes in milliseconds
const LOCKED_STORAGE_KEY = 'app_locked'
const SESSION_STORAGE_KEY = 'app_session_active'

export function OldApp(): JSX.Element {
  const [email, setEmail] = React.useState<string | null>(null)
  const [locked, setLocked] = React.useState<boolean>(false)
  const [isAuthenticationSetup, setIsAuthenticationSetup] =
    React.useState<boolean>(false)

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
   * Start/restart the inactivity timer
   */
  const startLockTimer = React.useCallback(() => {
    clearLockTimer()

    // Only set timer if user has authentication setup and is in sign or finished stage
    if (
      isAuthenticationSetup &&
      (onboarding === 'sign' || onboarding === 'finished') &&
      !locked
    ) {
      console.log('Starting inactivity timer')
      lockTimerRef.current = window.setTimeout(() => {
        console.log('Inactivity timeout - locking application')
        setLocked(true)
        clearEncryptionCache() // Clear encryption cache when locking due to inactivity
        setSecrets([]) // Clear secrets from state when locked
      }, INACTIVITY_TIMEOUT)
    }
  }, [onboarding, locked, isAuthenticationSetup, clearLockTimer])

  /**
   * Handle user activity to reset lock timer
   */
  const handleUserActivity = React.useCallback(() => {
    startLockTimer()
  }, [startLockTimer])

  /**
   * Sync locked state with localStorage and handle session tracking
   */
  React.useEffect(() => {
    // Only manage lock state if authentication is setup
    if (!isAuthenticationSetup) {
      return
    }

    if (locked) {
      localStorage.setItem(LOCKED_STORAGE_KEY, 'true')
      clearLockTimer() // Clear timer when locked
      clearEncryptionCache() // Clear encryption cache when locking
      setSecrets([]) // Clear secrets from state when locked
    } else {
      localStorage.removeItem(LOCKED_STORAGE_KEY)
      // Mark session as active when unlocked
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
      startLockTimer() // Start timer when unlocked
    }
  }, [locked, isAuthenticationSetup, clearLockTimer, startLockTimer])

  /**
   * Set up user activity listeners and session management
   */
  React.useEffect(() => {
    const activityEvents = [
      'mousedown',
      'keypress',
      'scroll',
      'touchstart',
      'mousemove'
    ]

    // Mark session as active on initial load if not locked
    if (!locked) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
    }

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleUserActivity, {passive: true})
    })

    // Start initial timer
    startLockTimer()

    // Handle page unload - clear session storage to force lock on next load
    const handleBeforeUnload = () => {
      sessionStorage.removeItem(SESSION_STORAGE_KEY)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup function
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleUserActivity)
      })
      window.removeEventListener('beforeunload', handleBeforeUnload)
      clearLockTimer()
    }
  }, [handleUserActivity, startLockTimer, clearLockTimer, locked])

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
        // Check if master password exists
        const masterPasswordResult = await hasMasterPassword()
        if (masterPasswordResult.success) {
          setIsAuthenticationSetup(true)

          // Check if app should be locked on page load
          const wasSessionActive =
            sessionStorage.getItem(SESSION_STORAGE_KEY) === 'true'
          const wasLocked = localStorage.getItem(LOCKED_STORAGE_KEY) === 'true'

          // Lock if session wasn't active (page refresh/reopen) or was previously locked
          if (!wasSessionActive || wasLocked) {
            setLocked(true)
            return
          }

          // Load email to determine correct onboarding stage
          const emailResult = await getEmail()
          if (emailResult.success && emailResult.data.email) {
            setOnboarding('finished')
            setEmail(emailResult.data.email)
          } else {
            setOnboarding('sign')
          }
        }

        const secretsResult = await getAllSecrets()
        if (secretsResult.success && secretsResult.data) {
          setSecrets(secretsResult.data)
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
      }
    }

    loadInitialData()
  }, [])

  /**
   * Handle setting master password
   */
  const handleMasterPassword = React.useCallback(
    async (masterPassword: string) => {
      try {
        await storeMasterPassword(masterPassword)
        setIsAuthenticationSetup(true)
        setOnboarding('sign')
        // TODO After setting master password, reload secrets since encryption is now available?
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
          <></>
        : <>
            {onboarding === 'sign' && <SignUpForm addEmail={handleEmail} />}
            {onboarding === 'master' && (
              <MasterPasswordForm addMasterPassword={handleMasterPassword} />
            )}
          </>
        }
      </Layout>
    </div>
  )
}
