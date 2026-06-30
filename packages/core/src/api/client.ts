interface ApiClientConfig {
  baseUrl: string
  token: string
  onRefreshToken?: () => Promise<string>
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: unknown
}

export function createApiClient(config: ApiClientConfig) {
  const { baseUrl } = config
  let token = config.token

  async function attemptFetch(path: string, options: RequestOptions, currentToken: string): Promise<Response> {
    const init: RequestInit = {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
    }
    if (options.body !== undefined) init.body = JSON.stringify(options.body)
    return fetch(`${baseUrl}${path}`, init)
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    let res = await attemptFetch(path, options, token)

    // 401: try token refresh once
    if (res.status === 401 && config.onRefreshToken) {
      try {
        token = await config.onRefreshToken()
        res = await attemptFetch(path, options, token)
      } catch {
        // refresh failed — fall through to error handling
      }
    }

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: res.statusText }))
      const err = new Error(error.message ?? `HTTP ${res.status}`)
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
