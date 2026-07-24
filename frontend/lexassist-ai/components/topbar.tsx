'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Scale, Search, Bell, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const mobileNav = [
  { href: '/', label: 'Dashboard' },
  { href: '/documents', label: 'Documents' },
  { href: '/chat', label: 'Assistant' },
  { href: '/drafting', label: 'Drafting' },
]

export function Topbar() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-md transition-all">
      <div className="flex h-16 items-center gap-3 px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 md:hidden">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-500 border border-amber-500/30">
            <Scale className="size-4" />
          </div>
          <span className="font-serif text-base font-bold tracking-tight">LexAssist</span>
        </Link>

        <div className="relative hidden max-w-md flex-1 sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search documents, clauses, or ask a question..."
            className="h-9.5 pl-9 pr-12 text-sm bg-secondary/40 border-border/60 focus:bg-background transition-all"
            aria-label="Search"
          />
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-2xs">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <Button variant="ghost" size="icon" className="relative size-9 rounded-lg hover:bg-secondary" aria-label="Notifications">
            <Bell className="size-4.5 text-muted-foreground" />
            <span className="absolute top-2 right-2 size-2 rounded-full bg-amber-500 ring-2 ring-background" />
          </Button>
          
          <Button
            render={<Link href="/documents" />}
            nativeButton={false}
            size="sm"
            className="gap-1.5 rounded-lg bg-primary font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Document</span>
          </Button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 md:hidden border-t border-border/40 pt-2">
        {mobileNav.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                active ? 'bg-primary text-primary-foreground shadow-xs' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
