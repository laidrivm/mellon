import {describe, expect, test} from 'bun:test'
import BIP39_WORDLIST from '../englishMnemonics.json'

// Mirrors the helpers inside recovery.ts. Kept local so the test exercises
// encoding semantics without pulling in the side-effectful module.

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
    if (wordIndex === -1) throw new Error(`Invalid word: ${word}`)
    bitString += wordIndex.toString(2).padStart(11, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i < bitString.length; i += 8) {
    const bits = bitString.slice(i, i + 8)
    if (bits.length === 8) bytes.push(parseInt(bits, 2))
  }
  return new Uint8Array(bytes)
}

describe('recovery mnemonic encoding', () => {
  test('16-byte seed padded with a zero byte yields 12 words', () => {
    const seed = new Uint8Array(16).fill(0xab)
    const padded = new Uint8Array(17)
    padded.set(seed)

    const words = bytesToMnemonic(padded)

    expect(words.length).toBe(12)
  })

  test('12-word roundtrip recovers the original 16-byte seed', () => {
    const seed = new Uint8Array(16)
    for (let i = 0; i < seed.length; i++) seed[i] = (i * 17 + 3) & 0xff

    const padded = new Uint8Array(17)
    padded.set(seed)
    const words = bytesToMnemonic(padded)
    const decoded = mnemonicToBytes(words).slice(0, 16)

    expect(Array.from(decoded)).toEqual(Array.from(seed))
  })

  test('different 16-byte seeds produce different 12-word outputs', () => {
    const padA = new Uint8Array(17)
    padA.set(new Uint8Array(16).fill(0x01))
    const padB = new Uint8Array(17)
    padB.set(new Uint8Array(16).fill(0x02))

    const wordsA = bytesToMnemonic(padA).join(' ')
    const wordsB = bytesToMnemonic(padB).join(' ')

    expect(wordsA).not.toBe(wordsB)
  })
})
