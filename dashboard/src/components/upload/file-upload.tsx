import { useRef, useState } from 'react'
import { UploadCloud, FileIcon, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSubmission } from '@/lib/submission'
import { ErrorState } from '@/components/states/error-state'

export type UploadResult = { key: string; url: string }

async function uploadFile(file: File): Promise<UploadResult> {
  const body = new FormData()
  body.set('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    if (res.status === 403 && payload?.error === 'not_configured') {
      throw new Error(
        'Uploads are disabled: this deployment needs Netlify Identity enabled and an ' +
          'uploadAllowedRoles list configured (see README > Uploads) before files can be uploaded.',
      )
    }
    throw new Error(payload?.error ?? `Upload failed (${res.status})`)
  }
  return res.json()
}

/**
 * Drag/drop file uploader wired to `/api/upload` (netlify/functions/upload.mts
 * -> Blobs store "uploads"). Not attached to any entity by default — see
 * README › Uploads for how to store the returned `{ key, url }` on a record.
 */
export function FileUpload({ onUploaded }: { onUploaded?: (result: UploadResult) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const { state, run, reset } = useSubmission(async (file: File) => {
    setFileName(file.name)
    const result = await uploadFile(file)
    onUploaded?.(result)
    return result
  })

  function handleFiles(files: FileList | null) {
    const file = files?.[0]
    if (file) run(file)
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
        )}
      >
        {state.status === 'success' ? (
          <>
            <CheckCircle2 className="size-8 text-primary" />
            <p className="text-sm font-medium">{fileName}</p>
            <p className="text-xs text-muted-foreground">Uploaded — key: {state.data.key}</p>
          </>
        ) : (
          <>
            <UploadCloud className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">Drag a file here, or click to browse</p>
            <p className="text-xs text-muted-foreground">Max 4 MB</p>
          </>
        )}
        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {fileName && state.status !== 'success' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileIcon className="size-4" />
          {fileName}
        </div>
      ) : null}

      {state.status === 'error' ? <ErrorState message={state.error} onRetry={reset} /> : null}

      {state.status === 'submitting' ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Uploading...
        </div>
      ) : null}
    </div>
  )
}
