/**
 * Fetch wrapper that handles error responses consistently.
 * Returns { data, error } — never throws.
 */
export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, options);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const message = body?.error || `Request failed (${res.status})`;
      return { data: null, error: message };
    }

    const data = await res.json();
    return { data, error: null };
  } catch {
    return { data: null, error: "Network error — please check your connection" };
  }
}
