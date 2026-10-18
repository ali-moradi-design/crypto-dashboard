import type { ReactNode } from 'react'

function Panel({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children?: ReactNode
}) {
  return (
    <section
      aria-label={title}
      className={`flex min-h-48 flex-col rounded-lg border bg-card ${className ?? ''}`}
    >
      <h2 className="border-b px-3 py-2 text-sm font-medium">{title}</h2>
      <div className="flex flex-1 items-center justify-center p-3 text-sm text-muted-foreground">
        {children ?? 'Coming soon'}
      </div>
    </section>
  )
}

export function DashboardPage() {
  return (
    <main className="grid flex-1 gap-2 p-2 lg:grid-cols-[minmax(20rem,24rem)_1fr_minmax(16rem,20rem)]">
      <Panel title="Markets" className="lg:row-span-2" />
      <Panel title="Chart" className="min-h-96" />
      <Panel title="Order book" className="lg:row-span-2" />
      <Panel title="Recent trades" />
    </main>
  )
}
