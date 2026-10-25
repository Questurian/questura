import type { IdentityResponse } from './identity.ts'

export const pendingIdentity = { response: null, loading: true, error: null } as const
type Snapshot = { response: IdentityResponse | null; loading: boolean; error: unknown }
type Retry = { retry: false } | { retry: true; delayMs: number }
type Options = {
  read: () => Promise<IdentityResponse>
  retry: (error: unknown, attempt: number) => Retry
  anonymous: (error: unknown) => boolean
}

/** A small reactive view of the existing identity reader. It never grants access. */
export class IdentityObserver {
  private snapshot: Snapshot = pendingIdentity
  private listeners = new Set<() => void>()
  private generation = 0
  private pending: { generation: number; promise: Promise<void> } | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private wake: (() => void) | null = null
  private options: Options

  constructor(options: Options) { this.options = options }

  getSnapshot = (): Snapshot => this.snapshot
  getServerSnapshot = (): Snapshot => pendingIdentity

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    void this.refresh()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) this.cancelWait()
    }
  }

  private publish(snapshot: Snapshot): void {
    this.snapshot = snapshot
    for (const listener of this.listeners) listener()
  }

  accept(response: IdentityResponse): void {
    if (this.snapshot.response === response && !this.snapshot.loading && !this.snapshot.error) return
    this.publish({ response, loading: false, error: null })
  }

  invalidate(): void {
    this.generation += 1
    this.cancelWait()
    this.publish(pendingIdentity)
    if (this.listeners.size > 0) void this.refresh()
  }

  private cancelWait(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.wake?.()
    this.wake = null
  }

  refresh = (): Promise<void> => {
    const generation = this.generation
    if (this.pending?.generation === generation) return this.pending.promise
    const promise = this.load(generation)
    const pending = { generation, promise }
    this.pending = pending
    void promise.finally(() => { if (this.pending === pending) this.pending = null })
    return promise
  }

  private async load(generation: number): Promise<void> {
    for (let attempt = 1; generation === this.generation; attempt += 1) {
      try {
        const response = await this.options.read()
        if (generation === this.generation) this.accept(response)
        return
      } catch (error) {
        if (generation !== this.generation) return
        if (this.options.anonymous(error)) {
          this.accept({ authenticated: false, principal: null })
          return
        }
        // A failed lookup is not proof that a reader signed out.
        this.publish({ ...this.snapshot, loading: false, error })
        const next = this.options.retry(error, attempt)
        if (!next.retry || this.listeners.size === 0) return
        if (next.delayMs > 0) await new Promise<void>((resolve) => {
          this.wake = resolve
          this.timer = setTimeout(() => { this.timer = null; this.wake = null; resolve() }, next.delayMs)
        })
        if (this.listeners.size === 0) return
      }
    }
  }
}
