import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('wotobot failed to render', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-zinc-100">
        <section className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
          <h1 className="text-xl font-semibold">wotobot could not start</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Reload the editor to try again. Your saved .wbb files are not affected.
          </p>
          <button
            className="mt-5 rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-white"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload editor
          </button>
          <details className="mt-5 text-xs text-zinc-500">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap">{this.state.error.message}</pre>
          </details>
        </section>
      </main>
    )
  }
}
