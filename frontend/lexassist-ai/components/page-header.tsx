import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-border/50 pb-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5">
          <span className="text-amber-500 font-bold">LexAssist</span>
          <span>/</span>
          <span>Legal Intelligence</span>
        </div>
        <h1 className="text-balance font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-3xl text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="flex items-center gap-2.5 shrink-0">{children}</div> : null}
    </div>
  )
}
