'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  MessagesSquare,
  PenLine,
  ShieldAlert,
  Search,
  Scale,
  Settings,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const nav = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/chat', label: 'AI Assistant', icon: MessagesSquare },
  { href: '/drafting', label: 'Drafting', icon: PenLine },
]

const tools = [
  { href: '/risk-analysis', label: 'Risk Analysis', icon: ShieldAlert },
  { href: '/search', label: 'Semantic Search', icon: Search },
  { href: '/research', label: 'Legal Research', icon: BookOpen },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border/60">
        <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/30 text-amber-400 border border-amber-500/30 shadow-sm">
          <Scale className="size-5" />
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-1.5">
            <p className="font-serif text-lg font-bold tracking-tight text-sidebar-foreground">LexAssist</p>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">PRO</span>
          </div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-sidebar-foreground/50">AI Legal Intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Workspace
          </p>
          <ul className="flex flex-col gap-1">
            {nav.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-semibold'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    )}
                    <item.icon className={cn("size-4.5 transition-colors", active ? "text-amber-400" : "text-sidebar-foreground/60")} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            Analysis Tools
          </p>
          <ul className="flex flex-col gap-1">
            {tools.map((item) => {
              const active = pathname === item.href
              return (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm font-semibold'
                        : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    )}
                    <item.icon className={cn("size-4.5 transition-colors", active ? "text-amber-400" : "text-sidebar-foreground/60")} />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent/40 border border-sidebar-border/40 px-3 py-2.5 transition-colors hover:bg-sidebar-accent/70">
          <div className="relative">
            <Avatar className="size-9 border border-amber-500/20">
              <AvatarFallback className="bg-amber-500/20 text-amber-300 font-semibold text-xs">
                AC
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 ring-2 ring-sidebar" />
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">Alex Carter</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">Counsel · Acme Corp</p>
          </div>
          <Settings className="size-4 text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors cursor-pointer" />
        </div>
      </div>
    </aside>
  )
}
