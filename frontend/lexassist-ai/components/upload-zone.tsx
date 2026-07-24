
"use client"

import { useRef, useState } from 'react'
import { UploadCloud, FileCheck2, X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { proxyBackendJson } from '@/lib/backend-client'

type Staged = { name: string; progress: number; done: boolean; uploaded?: boolean; error?: string }

export function UploadZone({ onUploaded }: { onUploaded?: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<Staged[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function sendToApi(name: string, file?: File) {
    const formData = new FormData()
    if (file) formData.append('file', file)
    else formData.append('name', name)

    const response = await proxyBackendJson<{ document: { id: string; name: string } }>("/documents", {
      method: 'POST',
      body: formData,
    })

    return response
  }

  function addFiles(list: FileList | null) {
    if (!list) return
    const next = Array.from(list).map((f) => ({ name: f.name, progress: 0, done: false }))
    setFiles((prev) => [...prev, ...next])
    next.forEach((staged) => {
      const timer = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.name !== staged.name || f.done) return f
            const progress = Math.min(100, f.progress + 15 + Math.random() * 20)
            return { ...f, progress, done: progress >= 100 }
          }),
        )
      }, 250)
      setTimeout(async () => {
        clearInterval(timer)
        try {
          const fileIndex = Array.from(list).findIndex((item) => item.name === staged.name)
          const file = fileIndex >= 0 ? list.item(fileIndex) : null
          await sendToApi(staged.name, file ?? undefined)
          setFiles((prev) => prev.map((f) => (f.name === staged.name ? { ...f, uploaded: true } : f)))
          onUploaded?.()
        } catch {
          setFiles((prev) => prev.map((f) => (f.name === staged.name ? { ...f, error: 'Upload failed' } : f)))
        }
      }, 2500)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 bg-secondary/20 p-8 text-center transition-all duration-200 hover:border-primary/50 hover:bg-secondary/40',
          dragging && 'border-primary bg-primary/10 scale-[1.01] shadow-lg ring-4 ring-primary/10',
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 group-hover:scale-110 group-hover:bg-amber-500/20 transition-all duration-200 shadow-xs">
          <UploadCloud className="size-7" />
        </div>
        <p className="mt-4 font-semibold text-foreground text-base">Drop legal documents here or click to upload</p>
        <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
          Supports <span className="font-medium text-foreground">PDF, DOCX, TXT, Images</span> · OCR parsing & FAISS vector indexing execute automatically upon upload
        </p>
        
        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-secondary border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Auto OCR Scan
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            FAISS Vector Storage
          </span>
          <span className="inline-flex items-center rounded-full bg-secondary border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            Risk Analysis
          </span>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-3.5 rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs transition-all hover:border-border"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground border border-border/50">
                {f.done ? (
                  <FileCheck2 className="size-5 text-emerald-500" />
                ) : (
                  <Loader2 className="size-5 animate-spin text-amber-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{f.name}</p>
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {f.done ? '100%' : `${Math.round(f.progress)}%`}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      f.done ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-amber-600',
                    )}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
                {f.uploaded && <p className="mt-1 text-[11px] font-medium text-emerald-500 flex items-center gap-1">✓ Ingested & indexed into database</p>}
                {f.error && <p className="mt-1 text-[11px] font-medium text-destructive">{f.error}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
