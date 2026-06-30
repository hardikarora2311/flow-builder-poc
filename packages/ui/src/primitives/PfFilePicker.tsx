import { useRef, useState, type ChangeEvent } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { PfButton } from './PfButton'

export interface PfFilePickerProps {
  /** Comma-separated MIME types or extensions, e.g. "image/*,.pdf" */
  accept?:     string | undefined
  multiple?:   boolean | undefined
  onChange?:   ((files: File[]) => void) | undefined
  /** Pre-populated files (useful when editing an existing application) */
  initialFiles?: Array<{ name: string; size?: number | undefined }> | undefined
  disabled?:   boolean | undefined
  error?:      boolean | undefined
  className?:  string | undefined
  label?:      string | undefined
}

const cx = (...p: Array<string | undefined | false>) => p.filter(Boolean).join(' ')

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

/**
 * File upload control. In production this would integrate with a presigned
 * URL upload to S3; here it just collects File objects for the form to send.
 */
export function PfFilePicker({
  accept,
  multiple,
  onChange,
  initialFiles = [],
  disabled,
  error,
  className,
  label = 'Choose file',
}: PfFilePickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<Array<{ name: string; size?: number; file?: File }>>(
    () => initialFiles.map((f) => {
      const entry: { name: string; size?: number } = { name: f.name }
      if (f.size !== undefined) entry.size = f.size
      return entry
    })
  )

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? [])
    const next = multiple
      ? [...files, ...picked.map((f) => ({ name: f.name, size: f.size, file: f }))]
      : picked.map((f) => ({ name: f.name, size: f.size, file: f }))
    setFiles(next)
    onChange?.(next.map((f) => f.file).filter(Boolean) as File[])
  }

  const remove = (idx: number) => {
    const next = files.filter((_, i) => i !== idx)
    setFiles(next)
    onChange?.(next.map((f) => f.file).filter(Boolean) as File[])
  }

  return (
    <div className={cx('pf-stack pf-stack--gap-sm', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        style={{ display: 'none' }}
        onChange={handleChange}
        aria-invalid={error || undefined}
      />
      <PfButton
        type="button"
        variant="secondary"
        inline
        leftIcon={<Upload size={16} />}
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
      >
        {label}
      </PfButton>
      {files.length > 0 && (
        <div className="pf-stack pf-stack--gap-xs">
          {files.map((f, i) => (
            <div
              key={`${f.name}-${i}`}
              className="pf-card pf-card--surface pf-stack pf-stack--row pf-stack--center pf-stack--between"
              style={{ padding: '8px 12px' }}
            >
              <div className="pf-stack pf-stack--row pf-stack--center pf-stack--gap-sm">
                <FileText size={16} color="var(--pf-color-text-muted)" />
                <div>
                  <p className="pf-text pf-text--sm">{f.name}</p>
                  {f.size !== undefined && (
                    <p className="pf-text pf-text--xs pf-text--muted">{formatBytes(f.size)}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label={`Remove ${f.name}`}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--pf-color-text-muted)', padding: 4,
                }}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
