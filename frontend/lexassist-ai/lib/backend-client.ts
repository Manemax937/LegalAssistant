const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_BACKEND_API_URL || process.env.BACKEND_API_URL || "http://127.0.0.1:8000"

export async function proxyBackendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      ...(init?.headers ?? {}),
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error((data && (data.detail || data.error)) || response.statusText)
    ;(error as Error & { status?: number }).status = response.status
    throw error
  }

  return data as T
}

export async function backendIsReachable() {
  try {
    await proxyBackendJson<{ ok: boolean }>("/health")
    return true
  } catch {
    return false
  }
}

export async function downloadPdfFile(title: string, content: string) {
  const response = await fetch(`${BACKEND_API_URL}/download-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content }),
  })

  if (!response.ok) {
    throw new Error("Failed to download PDF")
  }

  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${title.replace(/\s+/g, "_")}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}
