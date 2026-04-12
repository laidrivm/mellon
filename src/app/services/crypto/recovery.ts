import {combine, split} from 'shamir-secret-sharing'
import type {ServiceResponse} from '../../../types.ts'
import BIP39_WORDLIST from '../englishMnemonics.json'
import {getCachedMasterPassword} from '../session.ts'
import {dateToSalt, deriveKeyFromPassword} from './webcrypto.ts'

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

export async function generateRecoveryShares(
  createdAt: string
): Promise<ServiceResponse<string[]>> {
  try {
    const masterPassword = getCachedMasterPassword()
    if (!masterPassword) {
      return {success: false, error: 'Master password not available in cache'}
    }

    const salt = await dateToSalt(createdAt, 32)
    const derivedKey = await deriveKeyFromPassword(masterPassword, salt)

    const keyData = await crypto.subtle.exportKey('raw', derivedKey)
    const keyBytes = new Uint8Array(keyData)

    const shares = await split(keyBytes, 2, 2)

    const mnemonicShares = shares.map((share: Uint8Array) =>
      bytesToMnemonic(share).join(' ')
    )

    return {success: true, data: mnemonicShares}
  } catch (error) {
    console.error('Error generating recovery shares:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export async function reconstructMasterKey(
  mnemonicShares: string[]
): Promise<{data: CryptoKey | null; success: boolean}> {
  try {
    const shareBytes = mnemonicShares.map((mnemonic) =>
      mnemonicToBytes(mnemonic.trim().split(/\s+/))
    )

    const reconstructedKeyBytes = await combine(shareBytes)

    const reconstructedKey = await crypto.subtle.importKey(
      'raw',
      reconstructedKeyBytes.buffer as ArrayBuffer,
      {name: 'AES-GCM', length: 256},
      false,
      ['encrypt', 'decrypt']
    )

    return {data: reconstructedKey, success: true}
  } catch (error) {
    console.error('Error reconstructing master password:', error)
    return {data: null, success: false}
  }
}
