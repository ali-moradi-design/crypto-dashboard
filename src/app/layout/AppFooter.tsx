export function AppFooter() {
  return (
    <footer className="border-t px-3 py-3 text-xs text-muted-foreground sm:px-4">
      <p>
        <strong className="font-medium text-foreground">Not financial advice.</strong> Market data
        from the public{' '}
        <a
          className="underline underline-offset-2"
          href="https://www.gate.com"
          target="_blank"
          rel="noreferrer"
        >
          Gate
        </a>{' '}
        API. This is a technical demo.
      </p>
      <p className="mt-1">
        Charts by{' '}
        <a
          className="underline underline-offset-2"
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noreferrer"
        >
          TradingView
        </a>{' '}
        Lightweight Charts™.
      </p>
    </footer>
  )
}
