import type {ApiError} from './errors.ts'

export async function withApiError<T>(
  buildError: (cause: Error) => ApiError,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    const cause = error instanceof Error ? error : new Error(String(error))
    const apiError = buildError(cause)
    console.error(`[${apiError.name}] ${apiError.message}:`, cause.message)
    throw apiError
  }
}
