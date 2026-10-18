import { ThemeToggle } from '@/features/switch-theme'

export function AppHeader() {
  return (
    <header className="border-b bg-card">
      <div className="flex h-12 items-center gap-3 px-3 sm:px-4">
        <span aria-hidden className="bg-brand-gradient size-6 rounded-md" />
        <span className="font-semibold tracking-tight">Crypto dashboard</span>
        <div className="ms-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
      <div aria-hidden className="bg-brand-gradient h-0.5" />
    </header>
  )
}
