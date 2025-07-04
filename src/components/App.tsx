import React from 'react'

import './App.css'

import Layout from './Layout.tsx'
import SecretForm from './SecretForm.tsx'
import StoredSecrets from './StoredSecrets.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'
import RecoveryDisplay from './RecoveryDisplay.tsx'
import UnlockForm from './UnlockForm.tsx'
import RecoveryForm from './RecoveryForm.tsx'
import SignUpForm from './SignUpForm.tsx'
import CodeForm from './CodeForm.tsx'
import Header from './Header.tsx'
import Footer from './Footer.tsx'

import {createSecret, getAllSecrets, deleteSecret} from '../services/secrets.ts'
import {
  existsLocalUser,
  createLocalUser,
  getOnboardingStage,
  updateOnboardingStage,
  storeMasterPassword,
  getEmail,
  storeEmail,
  verifyMasterPassword,
  verifyRecoveredMasterPassword
} from '../services/users.ts'
import {clearEncryptionCache} from '../services/encryption.ts'
import {OnboardingStage, Secret, FormState} from '../types.ts'

const INACTIVITY_TIMEOUT = 2 * 60 * 1000 // 2 minutes in milliseconds

/**
 * Main application component
 * @returns {JSX.Element} App component
 */
export default function App(): JSX.Element {
  const [onboarding, setOnboarding] =
    React.useState<OnboardingStage>('finished')
  const [secrets, setSecrets] = React.useState<Secret[]>([])
  const [showForm, setShowForm] = React.useState<FormState | null>(null)
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(false)
  const [email, setEmail] = React.useState<string | null>(null)
  const [formError, setFormError] = React.useState<string | null>(null)
  //TODO: rewrite into unified failedData state and showError function
  const [failedSecretData, setFailedSecretData] = React.useState<Secret | null>(
    null
  )
  const [failedMasterPasswordData, setFailedMasterPasswordData] =
    React.useState<MasterPassword | null>(null)

  const lockTimerRef = React.useRef<number | null>(null)

  function initOnboarding(stage: OnboardingStage): void {
    setOnboarding(stage)
    switch (stage) {
      case 'secret':
        setShowForm('secret')
        setIsAuthenticated(true)
        break
      case 'master':
        setShowForm('masterPassword')
        setIsAuthenticated(true)
        break
      case 'recovery':
        setShowForm(null)
        break
      case 'sign':
        setShowForm('sign')
        break
      case 'code':
        setShowForm('code')
        break
      case 'finished':
        setShowForm(null)
        break
      default:
        console.error('Error: unknown onboarding stage')
    }
  }

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
    if (isAuthenticated) {
      console.log('Starting inactivity timer')
      lockTimerRef.current = window.setTimeout(() => {
        console.log('Inactivity timeout - locking application')
        setSecrets([]) // Clear secrets from state when locked
        clearEncryptionCache() // Clear encryption cache when locking due to inactivity
        setShowForm(null)
        setIsAuthenticated(false)
      }, INACTIVITY_TIMEOUT)
    }
  }, [isAuthenticated, clearLockTimer])

  /**
   * Handle user activity to reset lock timer
   */
  const handleUserActivity = React.useCallback(() => {
    startLockTimer()
  }, [startLockTimer])

  /**
   * Set up user activity listeners and session management
   */
  React.useEffect(() => {
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart']

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

  async function saveOnboardingStage(stage: OnboardingStage): void {
    await updateOnboardingStage(stage)
    initOnboarding(stage)
  }

  function showSecretsError(errorMessage: string, secret: Secret): void {
    setFormError(errorMessage)
    setFailedSecretData(secret)
    setShowForm('secret')
  }

  function showMasterPasswordError(
    errorMessage: string,
    masterPassword: MasterPassword
  ): void {
    setFormError(errorMessage)
    setFailedMasterPasswordData(masterPassword)
  }

  /**
   * Handle adding a new secret
   * @param {Secret} secret - New secret to add
   */
  const addSecret = React.useCallback(
    async (secret: Secret): Promise<void> => {
      setFormError(null)
      setFailedSecretData(null)

      const result = await createSecret(secret)

      if (result.success) {
        secret._id = result.data.id
        setSecrets((prevSecrets) => [secret, ...prevSecrets])
        if (onboarding === 'secret') {
          await saveOnboardingStage('master') // no failure check
        }
      } else {
        setSecrets((prevSecrets) => prevSecrets.filter((s) => s !== secret))
        showSecretsError(result.error, secret)
      }
    },
    [onboarding, setShowForm]
  )

  const removeSecret = React.useCallback((secretId: string) => {
    deleteSecret(secretId)
    setSecrets((prevSecrets) =>
      prevSecrets.filter((secret) => secret._id !== secretId)
    )
  }, [])

  // Clear the error when the form is closed
  const handleSetShowForm = React.useCallback(
    (form: FormState) => {
      setShowForm(form)
      if (!form) {
        setFormError(null)
        setFailedSecretData(null)
        setFailedMasterPasswordData(null)
        initOnboarding(onboarding)
      }
    },
    [onboarding]
  )

  /**
   * Handle setting a master password
   */
  const addMasterPassword = React.useCallback(
    async (masterPassword: MasterPassword) => {
      setFormError(null)
      setFailedMasterPasswordData(null)
      const result = await storeMasterPassword(masterPassword)
      console.log(JSON.stringify(result))

      if (result.success) {
        if (onboarding === 'master') {
          await saveOnboardingStage('recovery') // no failure check
          setIsAuthenticated(true)
        }
      } else {
        showMasterPasswordError(result.error, masterPassword)
      }
    },
    [onboarding]
  )

  /**
   * Handle recovery display continuation
   */
  const handleRecoveryContinue = React.useCallback(async () => {
    if (onboarding === 'recovery') {
      await saveOnboardingStage('sign')
    }
  }, [onboarding])

  /**
   * TODO: merge handleUnlock and handleRecoveryAttempt
   * Verify if password is valid
   */
  const handleUnlock = React.useCallback(
    async (masterPasswordCandidate: string) => {
      setFormError(null)
      const result = await verifyMasterPassword(masterPasswordCandidate)
      if (result) {
        setIsAuthenticated(true)
        // Reload secrets now that encryption is available
        const secretsResult = await getAllSecrets()
        if (secretsResult.success && secretsResult.data) {
          setSecrets(secretsResult.data)
        } // no error handling as there might be no stored secrets on unlock
      } else {
        setFormError('Invalid master password. Please try again.')
      }
    },
    []
  )

  /**
   * Handle recovery attempt
   */
  const handleRecoveryAttempt = React.useCallback(async (shares: string[]) => {
    setFormError(null)
    const result = await verifyRecoveredMasterPassword(shares)
    if (result) {
      setIsAuthenticated(true)
      setShowForm(null)
      // Reload secrets now that encryption is available
      const secretsResult = await getAllSecrets()
      if (secretsResult.success && secretsResult.data) {
        setSecrets(secretsResult.data)
      } // no error handling as there might be no stored secrets on unlock
    } else {
      setFormError('Invalid recovery words. Please try again.')
    }
  }, [])

  /**
   * Handle email signup
   */
  const handleEmail = React.useCallback(
    async (email: string) => {
      setFormError(null)
      const result = await storeEmail(email)
      if (result.success) {
        if (onboarding === 'sign') {
          await saveOnboardingStage('code')
        }
        setEmail(email)
      } else {
        setFormError(result.error)
      }
    },
    [onboarding]
  )

  const handleCode = React.useCallback(
    async (code: string) => {
      setFormError(null)
      //const result = await verifyCode(code)
      const result = {
        success: true,
        data: code
      }
      if (result.success) {
        if (onboarding === 'code') {
          await saveOnboardingStage('finished')
        }
      } else {
        setFormError(result.error)
      }
    },
    [onboarding]
  )

  /**
   * Load initial data on mount
   */
  React.useEffect(() => {
    async function loadInitialData() {
      if (!(await existsLocalUser())) {
        await createLocalUser()
        console.log(`creating local user`)
      }

      const currentOnboardingStage = await getOnboardingStage()
      initOnboarding(currentOnboardingStage)

      if (!isAuthenticated) return

      const secretsResult = await getAllSecrets()
      if (secretsResult.success && secretsResult.data) {
        setSecrets(secretsResult.data)
      }

      const emailResult = await getEmail()
      if (emailResult.success && emailResult.data.email) {
        setEmail(emailResult.data.email)
      }
    }

    loadInitialData()
  }, [isAuthenticated])

  return (
    <div className='flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      {isAuthenticated && <Header email={email} />}
      <Layout>
        {showForm === 'secret' && (
          <SecretForm
            onboarding={onboarding}
            addSecret={addSecret}
            handleSetShowForm={handleSetShowForm}
            formError={formError}
            initialData={failedSecretData}
          />
        )}
        {showForm === 'masterPassword' && (
          <MasterPasswordForm
            addMasterPassword={addMasterPassword}
            handleSetShowForm={handleSetShowForm}
            formError={formError}
            initialData={failedMasterPasswordData}
          />
        )}
        {onboarding === 'recovery' && isAuthenticated && (
          <RecoveryDisplay onContinue={handleRecoveryContinue} />
        )}
        {showForm === 'sign' && isAuthenticated && (
          <SignUpForm handleEmail={handleEmail} formError={formError} />
        )}
        {showForm === 'code' && (
          <CodeForm
            email={email}
            handleCode={handleCode}
            formError={formError}
          />
        )}
        {isAuthenticated ?
          <StoredSecrets
            secrets={secrets}
            showForm={showForm}
            handleSetShowForm={handleSetShowForm}
            removeSecret={removeSecret}
          />
        : showForm === 'recovery' ?
          <RecoveryForm
            onRecoveryAttempt={handleRecoveryAttempt}
            handleSetShowForm={handleSetShowForm}
            formError={formError}
          />
        : <UnlockForm
            tryUnlock={handleUnlock}
            handleSetShowForm={handleSetShowForm}
            formError={formError}
          />
        }
      </Layout>
      <Footer />
    </div>
  )
}
