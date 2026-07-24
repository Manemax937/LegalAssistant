export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    },
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    throw new Error(message || `Request failed with status ${response.status}`)
  }

  return (await response.json()) as T
}
