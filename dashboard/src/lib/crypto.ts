import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getDataEncryptionKey } from '@/config/flags'

/**
 * AES-256-GCM field/file encryption. Output layout: `iv(12) | tag(16) | ciphertext`.
 * Strings are stored base64 with a `v1:` prefix so the format can be rotated.
 * The key comes from `getDataEncryptionKey()` (env `DATA_ENCRYPTION_KEY`) and
 * the app fails closed when it's missing.
 */
const VERSION = 'v1:'

export function encryptBuffer(plain: Buffer, key: Buffer = getDataEncryptionKey()): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const body = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body])
}

export function decryptBuffer(data: Buffer, key: Buffer = getDataEncryptionKey()): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', key, data.subarray(0, 12))
  decipher.setAuthTag(data.subarray(12, 28))
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()])
}

export function encryptString(plain: string, key?: Buffer): string {
  return VERSION + encryptBuffer(Buffer.from(plain, 'utf8'), key).toString('base64')
}

export function decryptString(value: string, key?: Buffer): string {
  if (!value.startsWith(VERSION)) throw new Error('Unrecognized ciphertext format')
  return decryptBuffer(Buffer.from(value.slice(VERSION.length), 'base64'), key).toString('utf8')
}
