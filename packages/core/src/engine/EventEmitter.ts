type Handler<T> = (payload: T) => void

export class EventEmitter<Events extends Record<string, unknown>> {
  private handlers: Partial<{ [K in keyof Events]: Handler<Events[K]>[] }> = {}

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    if (!this.handlers[event]) this.handlers[event] = []
    this.handlers[event]!.push(handler)
    return () => this.off(event, handler)
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers[event] = this.handlers[event]?.filter((h) => h !== handler)
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    this.handlers[event]?.forEach((h) => h(payload))
  }

  removeAllListeners(): void {
    this.handlers = {}
  }
}
