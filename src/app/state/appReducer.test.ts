import {describe, expect, test} from 'bun:test'
import type {MasterPassword, OnboardingStage, Secret} from '../../types.ts'
import {
  type AppState,
  appReducer,
  deriveFromOnboarding,
  initialAppState
} from './appReducer.ts'

const makeSecret = (over: Partial<Secret> = {}): Secret => ({
  name: 'GitHub',
  username: 'me',
  password: 'pw',
  ...over
})

const makeMasterPassword = (
  over: Partial<MasterPassword> = {}
): MasterPassword => ({
  password: 'master',
  hint: 'h',
  ...over
})

describe('deriveFromOnboarding', () => {
  const cases: [OnboardingStage, {showForm: string | null; auth: boolean}][] = [
    ['secret', {showForm: 'secret', auth: true}],
    ['master', {showForm: 'masterPassword', auth: true}],
    ['sign', {showForm: 'sign', auth: false}],
    ['code', {showForm: 'code', auth: false}],
    ['recovery', {showForm: null, auth: false}],
    ['finished', {showForm: null, auth: false}]
  ]

  for (const [stage, expected] of cases) {
    test(`stage '${stage}'`, () => {
      const d = deriveFromOnboarding(stage)
      expect(d.showForm).toBe(expected.showForm as never)
      expect(d.authenticate).toBe(expected.auth)
    })
  }
})

describe('appReducer', () => {
  test('SET_ONBOARDING to "master" derives form and auth', () => {
    const next = appReducer(initialAppState, {
      type: 'SET_ONBOARDING',
      stage: 'master'
    })
    expect(next.onboarding).toBe('master')
    expect(next.showForm).toBe('masterPassword')
    expect(next.isAuthenticated).toBe(true)
  })

  test('SET_ONBOARDING to "recovery" preserves existing auth', () => {
    const authenticated: AppState = {...initialAppState, isAuthenticated: true}
    const next = appReducer(authenticated, {
      type: 'SET_ONBOARDING',
      stage: 'recovery'
    })
    expect(next.showForm).toBe(null)
    expect(next.isAuthenticated).toBe(true)
  })

  test('SET_SHOW_FORM with null re-derives from onboarding & clears feedback', () => {
    const state: AppState = {
      ...initialAppState,
      onboarding: 'secret',
      showForm: 'masterPassword',
      error: 'x',
      failedData: {kind: 'secret', value: makeSecret()}
    }
    const next = appReducer(state, {type: 'SET_SHOW_FORM', form: null})
    expect(next.showForm).toBe('secret')
    expect(next.error).toBe(null)
    expect(next.failedData).toBe(null)
  })

  test('SET_SHOW_FORM with a form sets it without clearing error', () => {
    const state: AppState = {...initialAppState, error: 'keep'}
    const next = appReducer(state, {type: 'SET_SHOW_FORM', form: 'recovery'})
    expect(next.showForm).toBe('recovery')
    expect(next.error).toBe('keep')
  })

  test('ADD_SECRET prepends and clears feedback', () => {
    const existing = makeSecret({_id: 'a', name: 'a'})
    const state: AppState = {
      ...initialAppState,
      secrets: [existing],
      error: 'e',
      failedData: {kind: 'secret', value: makeSecret()}
    }
    const fresh = makeSecret({_id: 'b', name: 'b'})
    const next = appReducer(state, {type: 'ADD_SECRET', secret: fresh})
    expect(next.secrets).toEqual([fresh, existing])
    expect(next.error).toBe(null)
    expect(next.failedData).toBe(null)
  })

  test('REMOVE_SECRET filters by id', () => {
    const a = makeSecret({_id: 'a'})
    const b = makeSecret({_id: 'b'})
    const state: AppState = {...initialAppState, secrets: [a, b]}
    const next = appReducer(state, {type: 'REMOVE_SECRET', id: 'a'})
    expect(next.secrets).toEqual([b])
  })

  test('SECRET_FAILED sets error, failedData, and reopens secret form', () => {
    const secret = makeSecret()
    const next = appReducer(initialAppState, {
      type: 'SECRET_FAILED',
      secret,
      error: 'boom'
    })
    expect(next.error).toBe('boom')
    expect(next.failedData).toEqual({kind: 'secret', value: secret})
    expect(next.showForm).toBe('secret')
  })

  test('MASTER_PASSWORD_FAILED carries the submitted value', () => {
    const mp = makeMasterPassword()
    const next = appReducer(initialAppState, {
      type: 'MASTER_PASSWORD_FAILED',
      masterPassword: mp,
      error: 'nope'
    })
    expect(next.failedData).toEqual({kind: 'masterPassword', value: mp})
    expect(next.error).toBe('nope')
  })

  test('UNLOCK_SUCCESS authenticates, loads secrets, clears form & error', () => {
    const state: AppState = {
      ...initialAppState,
      error: 'prior',
      showForm: 'recovery'
    }
    const secrets = [makeSecret({_id: 'x'})]
    const next = appReducer(state, {type: 'UNLOCK_SUCCESS', secrets})
    expect(next.isAuthenticated).toBe(true)
    expect(next.secrets).toBe(secrets)
    expect(next.showForm).toBe(null)
    expect(next.error).toBe(null)
  })

  test('UNLOCK_FAILURE only sets the error', () => {
    const next = appReducer(initialAppState, {
      type: 'UNLOCK_FAILURE',
      error: 'bad'
    })
    expect(next.error).toBe('bad')
    expect(next.isAuthenticated).toBe(false)
  })

  test('LOCK drops secrets and auth, closes any form', () => {
    const state: AppState = {
      ...initialAppState,
      isAuthenticated: true,
      secrets: [makeSecret()],
      showForm: 'secret'
    }
    const next = appReducer(state, {type: 'LOCK'})
    expect(next.isAuthenticated).toBe(false)
    expect(next.secrets).toEqual([])
    expect(next.showForm).toBe(null)
  })

  test('SET_ERROR(null) clears failedData too', () => {
    const state: AppState = {
      ...initialAppState,
      error: 'e',
      failedData: {kind: 'secret', value: makeSecret()}
    }
    const next = appReducer(state, {type: 'SET_ERROR', error: null})
    expect(next.error).toBe(null)
    expect(next.failedData).toBe(null)
  })

  test('SET_ERROR(string) preserves failedData', () => {
    const fd = {kind: 'secret' as const, value: makeSecret()}
    const state: AppState = {...initialAppState, failedData: fd}
    const next = appReducer(state, {type: 'SET_ERROR', error: 'e'})
    expect(next.error).toBe('e')
    expect(next.failedData).toEqual(fd)
  })
})
