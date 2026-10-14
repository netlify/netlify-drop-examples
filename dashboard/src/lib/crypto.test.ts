import { describe, it, expect } from 'vitest'
import { randomBytes } from 'node:crypto'
import { encryptString, decryptString, encryptBuffer, decryptBuffer } from '@/lib/crypto'

const key = randomBytes(32)

describe('crypto', () => {
  it('round-trips strings and buffers', () => {
    expect(decryptString(encryptString('Priya Shah', key), key)).toBe('Priya Shah')
    const buf = Buffer.from('id,owner\n1,x\n')
    expect(decryptBuffer(encryptBuffer(buf, key), key).equals(buf)).toBe(true)
  })
  it('uses a fresh IV each time and hides plaintext', () => {
    const a = encryptString('12345.67', key)
    expect(a).not.toBe(encryptString('12345.67', key))
    expect(a).not.toContain('12345')
  })
  it('rejects tampering and wrong keys', () => {
    const enc = encryptString('secret', key)
    const raw = Buffer.from(enc.slice(3), 'base64')
    raw[raw.length - 1] ^= 1
    expect(() => decryptString('v1:' + raw.toString('base64'), key)).toThrow()
    expect(() => decryptString(enc, randomBytes(32))).toThrow()
  })
})
