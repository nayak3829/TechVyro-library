function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /failed to fetch|network(?: request)? failed|load failed/i.test(error.message)
}

export async function retryAuthNetworkRequest<T>(
  request: () => Promise<T>,
): Promise<T> {
  try {
    return await request()
  } catch (error) {
    if (!isTransientNetworkError(error)) throw error
    await new Promise((resolve) => setTimeout(resolve, 500))
    return request()
  }
}