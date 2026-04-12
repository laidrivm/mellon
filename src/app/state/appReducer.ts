import type {
  FormState,
  MasterPassword,
  OnboardingStage,
  Secret
} from '../../types.ts'

export type FailedData =
  | {kind: 'secret'; value: Secret}
  | {kind: 'masterPassword'; value: MasterPassword}

export interface AppState {
  onboarding: OnboardingStage
  showForm: FormState | null
  isAuthenticated: boolean
  email: string | null
  secrets: Secret[]
  error: string | null
  failedData: FailedData | null
}

export type AppAction =
  | {type: 'SET_ONBOARDING'; stage: OnboardingStage}
  | {type: 'SET_SHOW_FORM'; form: FormState | null}
  | {type: 'ADD_SECRET'; secret: Secret}
  | {type: 'REMOVE_SECRET'; id: string}
  | {type: 'SET_SECRETS'; secrets: Secret[]}
  | {type: 'SECRET_FAILED'; secret: Secret; error: string}
  | {
      type: 'MASTER_PASSWORD_FAILED'
      masterPassword: MasterPassword
      error: string
    }
  | {type: 'UNLOCK_SUCCESS'; secrets: Secret[]}
  | {type: 'UNLOCK_FAILURE'; error: string}
  | {type: 'LOCK'}
  | {type: 'SET_EMAIL'; email: string}
  | {type: 'SET_ERROR'; error: string | null}

export const initialAppState: AppState = {
  onboarding: 'finished',
  showForm: null,
  isAuthenticated: false,
  email: null,
  secrets: [],
  error: null,
  failedData: null
}

interface OnboardingDerivation {
  showForm: FormState | null
  authenticate: boolean
}

// Pure derivation: stage → visible form & whether the stage implies auth.
// Only 'secret' and 'master' force authenticated=true (mid-onboarding);
// other stages preserve the existing auth state.
export function deriveFromOnboarding(
  stage: OnboardingStage
): OnboardingDerivation {
  switch (stage) {
    case 'secret':
      return {showForm: 'secret', authenticate: true}
    case 'master':
      return {showForm: 'masterPassword', authenticate: true}
    case 'sign':
      return {showForm: 'sign', authenticate: false}
    case 'code':
      return {showForm: 'code', authenticate: false}
    case 'recovery':
    case 'finished':
      return {showForm: null, authenticate: false}
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_ONBOARDING': {
      const d = deriveFromOnboarding(action.stage)
      return {
        ...state,
        onboarding: action.stage,
        showForm: d.showForm,
        isAuthenticated: d.authenticate || state.isAuthenticated
      }
    }
    case 'SET_SHOW_FORM': {
      if (action.form === null) {
        const d = deriveFromOnboarding(state.onboarding)
        return {
          ...state,
          showForm: d.showForm,
          error: null,
          failedData: null
        }
      }
      return {...state, showForm: action.form}
    }
    case 'ADD_SECRET':
      return {
        ...state,
        secrets: [action.secret, ...state.secrets],
        error: null,
        failedData: null
      }
    case 'REMOVE_SECRET':
      return {
        ...state,
        secrets: state.secrets.filter((s) => s._id !== action.id)
      }
    case 'SET_SECRETS':
      return {...state, secrets: action.secrets}
    case 'SECRET_FAILED':
      return {
        ...state,
        error: action.error,
        failedData: {kind: 'secret', value: action.secret},
        showForm: 'secret'
      }
    case 'MASTER_PASSWORD_FAILED':
      return {
        ...state,
        error: action.error,
        failedData: {kind: 'masterPassword', value: action.masterPassword}
      }
    case 'UNLOCK_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        secrets: action.secrets,
        showForm: null,
        error: null
      }
    case 'UNLOCK_FAILURE':
      return {...state, error: action.error}
    case 'LOCK':
      return {
        ...state,
        isAuthenticated: false,
        secrets: [],
        showForm: null
      }
    case 'SET_EMAIL':
      return {...state, email: action.email}
    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
        failedData: action.error === null ? null : state.failedData
      }
  }
}
