export async function generateNewKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, true, [
    'encrypt',
    'decrypt'
  ])
}

export async function encryptField(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const encryptedBuffer = await crypto.subtle.encrypt(
    {name: 'AES-GCM', iv: iv},
    key,
    dataBuffer
  )

  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(encryptedBuffer), iv.length)

  return btoa(String.fromCharCode.apply(null, Array.from(combined)))
}

export async function decryptField(
  data: string,
  key: CryptoKey
): Promise<string> {
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const iv = bytes.slice(0, 12)
  const encryptedData = bytes.slice(12)

  const decryptedBuffer = await crypto.subtle.decrypt(
    {name: 'AES-GCM', iv: iv},
    key,
    encryptedData
  )

  const decoder = new TextDecoder()
  return decoder.decode(decryptedBuffer)
}

export async function dateToSalt(
  isoDateString: string,
  saltLength = 32
): Promise<Uint8Array> {
  const encoder = new TextEncoder()
  const dateBytes = encoder.encode(isoDateString)

  const hashBuffer = await crypto.subtle.digest('SHA-256', dateBytes)
  const hashArray = new Uint8Array(hashBuffer)

  if (saltLength <= hashArray.length) {
    return hashArray.slice(0, saltLength)
  }

  const extendedSalt = new Uint8Array(saltLength)
  let offset = 0
  while (offset < saltLength) {
    const remainingBytes = saltLength - offset
    const bytesToCopy = Math.min(hashArray.length, remainingBytes)
    extendedSalt.set(hashArray.slice(0, bytesToCopy), offset)
    offset += bytesToCopy
  }
  return extendedSalt
}

export async function deriveKeyFromPassword(
  masterPassword: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  const passwordBuffer = encoder.encode(masterPassword)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  )

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    {name: 'AES-GCM', length: 256},
    true,
    ['encrypt', 'decrypt']
  )
}
