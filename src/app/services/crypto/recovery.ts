import type {ServiceResponse} from '../../../types.ts'
import BIP39_WORDLIST from '../englishMnemonics.json'
import {getCachedKey} from '../session.ts'
import {
  getEncryptedKeyByRecoveryBlob,
  storeEncryptedKeyByRecoveryInDB
} from './keyStore.ts'
import {dateToSalt, decryptField, deriveKeyFromPassword} from './webcrypto.ts'

const SEED_BYTES = 16
const WORD_COUNT = 12

function bytesToMnemonic(bytes: Uint8Array): string[] {
  const words: string[] = []

  let bitString = ''
  for (const byte of bytes) {
    bitString += byte.toString(2).padStart(8, '0')
  }

  for (let i = 0; i < bitString.length; i += 11) {
    const bits = bitString.slice(i, i + 11)
    if (bits.length === 11) {
      const wordIndex = parseInt(bits, 2) % BIP39_WORDLIST.words.length
      const word = BIP39_WORDLIST.words[wordIndex]
      if (word) words.push(word)
    }
  }

  return words
}

function mnemonicToBytes(words: string[]): Uint8Array {
  let bitString = ''

  for (const word of words) {
    const wordIndex = BIP39_WORDLIST.words.indexOf(word.toLowerCase())
    if (wordIndex === -1) {
      throw new Error(`Invalid mnemonic word: ${word}`)
    }
    bitString += wordIndex.toString(2).padStart(11, '0')
  }

  const bytes: number[] = []
  for (let i = 0; i < bitString.length; i += 8) {
    const bits = bitString.slice(i, i + 8)
    if (bits.length === 8) {
      bytes.push(parseInt(bits, 2))
    }
  }

  return new Uint8Array(bytes)
}

// Encode a 16-byte seed as a 12-word mnemonic.
// The encoder consumes whole 11-bit chunks, so we append a zero byte
// (16 bytes = 128 bits → pad to 136 bits = 12 words + 4 dropped bits).
function seedToMnemonic(seed: Uint8Array): string[] {
  const padded = new Uint8Array(SEED_BYTES + 1)
  padded.set(seed)
  return bytesToMnemonic(padded)
}

// Decode 12 words back to a 16-byte seed.
// mnemonicToBytes returns 16 bytes (drops the trailing 4 bits).
function mnemonicToSeed(words: string[]): Uint8Array {
  const bytes = mnemonicToBytes(words)
  return bytes.slice(0, SEED_BYTES)
}

function seedToPassword(seed: Uint8Array): string {
  return btoa(String.fromCharCode(...seed))
}

export async function generateRecoveryShares(
  createdAt: string
): Promise<ServiceResponse<string[]>> {
  try {
    const encryptionKey = getCachedKey()
    if (!encryptionKey) {
      return {success: false, error: 'Encryption key not available'}
    }

    const seed = crypto.getRandomValues(new Uint8Array(SEED_BYTES))
    const salt = await dateToSalt(createdAt, 32)
    const wrapKey = await deriveKeyFromPassword(seedToPassword(seed), salt)

    await storeEncryptedKeyByRecoveryInDB(encryptionKey, wrapKey)

    return {success: true, data: seedToMnemonic(seed)}
  } catch (error) {
    console.error('Error generating recovery mnemonic:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function reconstructMasterKey(
  mnemonic: string[],
  createdAt: string
): Promise<{data: CryptoKey | null; success: boolean}> {
  try {
    const words = mnemonic
      .flatMap((s) => s.trim().split(/\s+/))
      .filter((w) => w.length > 0)

    if (words.length !== WORD_COUNT) {
      console.log(`Expected ${WORD_COUNT} recovery words, got ${words.length}`)
      return {data: null, success: false}
    }

    const seed = mnemonicToSeed(words)
    const salt = await dateToSalt(createdAt, 32)
    const wrapKey = await deriveKeyFromPassword(seedToPassword(seed), salt)

    const encryptedBlob = await getEncryptedKeyByRecoveryBlob()
    if (!encryptedBlob) {
      console.log('No recovery-wrapped key stored')
      return {data: null, success: false}
    }

    const keyJson = await decryptField(encryptedBlob, wrapKey)
    const jwk = JSON.parse(keyJson)
    const encryptionKey = await crypto.subtle.importKey(
      'jwk',
      jwk,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )

    return {data: encryptionKey, success: true}
  } catch (error) {
    console.error('Error reconstructing encryption key from mnemonic:', error)
    return {data: null, success: false}
  }
}
