interface ApiClientConfig {
  baseUrl: string
  token: string
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
}

export function createApiClient({ baseUrl, token }: ApiClientConfig) {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body } = options

    const init: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
    // Only set body when present — exactOptionalPropertyTypes forbids
    // assigning `undefined` to RequestInit.body (BodyInit | null).
    if (body !== undefined) init.body = JSON.stringify(body)

    const res = await fetch(`${baseUrl}${path}`, init)

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      const err = new Error(error.message ?? `HTTP ${res.status}`)
      // Attach status for retryable check
      ;(err as Error & { status: number }).status = res.status
      throw err
    }

    return res.json() as Promise<T>
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  }
}
