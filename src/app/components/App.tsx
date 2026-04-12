import React, {type JSX} from 'react'

import './App.css'

import type {
  FormState,
  MasterPassword,
  OnboardingStage,
  Secret
} from '../../types.ts'
import {createSecret, deleteSecret, getAllSecrets} from '../services/secrets.ts'
import {startInactivityTimer} from '../services/session.ts'
import {
  createLocalUser,
  existsLocalUser,
  getEmail,
  getOnboardingStage,
  storeEmail,
  storeMasterPassword,
  updateOnboardingStage,
  verifyMasterPassword,
  verifyRecoveredMasterPassword
} from '../services/users.ts'
import {appReducer, initialAppState} from '../state/appReducer.ts'
import CodeForm from './CodeForm.tsx'
import Footer from './Footer.tsx'
import Header from './Header.tsx'
import Layout from './Layout.tsx'
import MasterPasswordForm from './MasterPasswordForm.tsx'
import RecoveryDisplay from './RecoveryDisplay.tsx'
import RecoveryForm from './RecoveryForm.tsx'
import SecretForm from './SecretForm.tsx'
import SignUpForm from './SignUpForm.tsx'
import StoredSecrets from './StoredSecrets.tsx'
import UnlockForm from './UnlockForm.tsx'

const INACTIVITY_TIMEOUT = 2 * 60 * 1000

export default function App(): JSX.Element {
  const [state, dispatch] = React.useReducer(appReducer, initialAppState)
  const {
    onboarding,
    showForm,
    isAuthenticated,
    email,
    secrets,
    error,
    failedData
  } = state

  const saveOnboardingStage = React.useCallback(
    async (stage: OnboardingStage): Promise<void> => {
      await updateOnboardingStage(stage)
      dispatch({type: 'SET_ONBOARDING', stage})
    },
    []
  )

  const setShowForm = React.useCallback((form: FormState | null) => {
    dispatch({type: 'SET_SHOW_FORM', form})
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated) return
    return startInactivityTimer(
      () => dispatch({type: 'LOCK'}),
      INACTIVITY_TIMEOUT
    )
  }, [isAuthenticated])

  const addSecret = React.useCallback(
    async (secret: Secret): Promise<void> => {
      const result = await createSecret(secret)
      if (result.success && result.data) {
        const persisted = {...secret, _id: (result.data as {id: string}).id}
        dispatch({type: 'ADD_SECRET', secret: persisted})
        if (onboarding === 'secret') await saveOnboardingStage('master')
      } else {
        dispatch({
          type: 'SECRET_FAILED',
          secret,
          error: result.error ?? 'Unknown error'
        })
      }
    },
    [onboarding, saveOnboardingStage]
  )

  const removeSecret = React.useCallback((id: string) => {
    deleteSecret(id)
    dispatch({type: 'REMOVE_SECRET', id})
  }, [])

  const addMasterPassword = React.useCallback(
    async (masterPassword: MasterPassword): Promise<void> => {
      const result = await storeMasterPassword(masterPassword)
      if (result.success) {
        if (onboarding === 'master') await saveOnboardingStage('recovery')
      } else {
        dispatch({
          type: 'MASTER_PASSWORD_FAILED',
          masterPassword,
          error: result.error ?? 'Unknown error'
        })
      }
    },
    [onboarding, saveOnboardingStage]
  )

  const handleRecoveryContinue = React.useCallback(async () => {
    if (onboarding === 'recovery') await saveOnboardingStage('sign')
  }, [onboarding, saveOnboardingStage])

  // Shared unlock path: the forms supply the verification call + error label,
  // this owns the post-unlock secrets load and dispatch of success/failure.
  const runUnlock = React.useCallback(
    async (attempt: () => Promise<boolean>, errorLabel: string) => {
      const ok = await attempt()
      if (!ok) {
        dispatch({type: 'UNLOCK_FAILURE', error: errorLabel})
        return
      }
      const result = await getAllSecrets()
      dispatch({
        type: 'UNLOCK_SUCCESS',
        secrets: result.success && result.data ? result.data : []
      })
    },
    []
  )

  const handleUnlock = React.useCallback(
    (password: string) =>
      runUnlock(
        () => verifyMasterPassword(password),
        'Invalid master password. Please try again.'
      ),
    [runUnlock]
  )

  const handleRecoveryAttempt = React.useCallback(
    (shares: string[]) =>
      runUnlock(
        () => verifyRecoveredMasterPassword(shares),
        'Invalid recovery words. Please try again.'
      ),
    [runUnlock]
  )

  const handleEmail = React.useCallback(
    async (addr: string) => {
      const result = await storeEmail(addr)
      if (!result.success) {
        dispatch({type: 'SET_ERROR', error: result.error ?? 'Unknown error'})
        return
      }
      dispatch({type: 'SET_EMAIL', email: addr})
      if (onboarding === 'sign') await saveOnboardingStage('code')
    },
    [onboarding, saveOnboardingStage]
  )

  const handleCode = React.useCallback(
    async (_code: string) => {
      // TODO: wire to verifyCode(code); currently always succeeds
      if (onboarding === 'code') await saveOnboardingStage('finished')
    },
    [onboarding, saveOnboardingStage]
  )

  React.useEffect(() => {
    async function loadInitialData() {
      if (!(await existsLocalUser())) await createLocalUser()

      const stage = await getOnboardingStage()
      if (stage) dispatch({type: 'SET_ONBOARDING', stage})

      if (!isAuthenticated) return

      const secretsResult = await getAllSecrets()
      if (secretsResult.success && secretsResult.data)
        dispatch({type: 'SET_SECRETS', secrets: secretsResult.data})

      const emailResult = await getEmail()
      if (emailResult.success && emailResult.data?.email)
        dispatch({type: 'SET_EMAIL', email: emailResult.data.email})
    }
    loadInitialData()
  }, [isAuthenticated])

  const initialSecret = failedData?.kind === 'secret' ? failedData.value : null
  const initialMasterPassword =
    failedData?.kind === 'masterPassword' ? failedData.value : null

  return (
    <div className='flex flex-col items-center bg-white px-4 font-light text-black antialiased md:subpixel-antialiased'>
      {isAuthenticated && <Header email={email} />}
      <Layout>
        {showForm === 'secret' && (
          <SecretForm
            onboarding={onboarding}
            addSecret={addSecret}
            handleSetShowForm={setShowForm}
            formError={error}
            initialData={initialSecret}
          />
        )}
        {showForm === 'masterPassword' && (
          <MasterPasswordForm
            addMasterPassword={addMasterPassword}
            handleSetShowForm={setShowForm}
            formError={error}
            initialData={initialMasterPassword}
          />
        )}
        {onboarding === 'recovery' && isAuthenticated && (
          <RecoveryDisplay onContinue={handleRecoveryContinue} />
        )}
        {showForm === 'sign' && isAuthenticated && (
          <SignUpForm handleEmail={handleEmail} formError={error} />
        )}
        {showForm === 'code' && email && (
          <CodeForm email={email} handleCode={handleCode} formError={error} />
        )}
        {isAuthenticated ? (
          <StoredSecrets
            secrets={secrets}
            showForm={showForm}
            handleSetShowForm={setShowForm}
            removeSecret={removeSecret}
          />
        ) : showForm === 'recovery' ? (
          <RecoveryForm
            onRecoveryAttempt={handleRecoveryAttempt}
            handleSetShowForm={setShowForm}
            formError={error}
          />
        ) : (
          <UnlockForm
            tryUnlock={handleUnlock}
            handleSetShowForm={setShowForm}
            formError={error}
          />
        )}
      </Layout>
      <Footer />
    </div>
  )
}
