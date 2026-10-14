import { getStore } from '@netlify/blobs'
import { decryptBuffer, encryptBuffer } from '@/lib/crypto'

/**
 * Raw uploaded files live in a dedicated Blobs store, encrypted with the same
 * key as the database fields before they are written. Never goes through the
 * generic `/api/upload` endpoint (which stays fail-closed).
 */
const STORE = 'dataset-uploads'

export async function putRawDataset(key: string, data: Buffer, metadata: Record<string, string>) {
  const encrypted = encryptBuffer(data)
  await getStore(STORE).set(key, new Blob([new Uint8Array(encrypted)]), { metadata })
}

export async function getRawDataset(key: string): Promise<Buffer | null> {
  const blob = await getStore(STORE).get(key, { type: 'arrayBuffer' })
  return blob ? decryptBuffer(Buffer.from(blob)) : null
}
