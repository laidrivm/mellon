import type {ServiceResponse} from '../../types.ts'

// Wraps a failable async operation into the project's ServiceResponse shape.
// Any thrown error becomes {success: false, error: message}; successful values
// are carried through as {success: true, data}. Validation failures inside fn
// should throw — the thrown message becomes the user-visible error.
export async function wrap<T>(
  label: string,
  fn: () => Promise<T>
): Promise<ServiceResponse<T>> {
  try {
    return {success: true, data: await fn()}
  } catch (error) {
    console.error(`Error ${label}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
