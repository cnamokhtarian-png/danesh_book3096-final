"use client";

/**
 * Client-side fetch wrapper with an abort timeout so a slow / offline network
 * surfaces a readable Persian message instead of hanging or throwing an
 * obscure error.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

const DEFAULT_TIMEOUT = 15_000;

export async function apiFetch<T = unknown>(
  url: string,
  options: { method?: string; body?: unknown; timeout?: number } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? DEFAULT_TIMEOUT);
  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
      credentials: "same-origin",
    });

    let payload: { ok?: boolean; message?: string; data?: T } = {};
    try {
      payload = (await response.json()) as typeof payload;
    } catch {
      payload = {};
    }

    if (!response.ok) {
      return {
        ok: false,
        message:
          payload.message ??
          (response.status >= 500
            ? "سرور موقتاً در دسترس نیست. لطفاً چند لحظه بعد تلاش کنید."
            : "درخواست انجام نشد."),
      };
    }
    return { ok: true, data: (payload.data ?? (payload as unknown)) as T };
  } catch (error) {
    const name = (error as Error)?.name;
    if (name === "AbortError") {
      return {
        ok: false,
        message: "پاسخ سرور بیش از حد طول کشید. اینترنت خود را بررسی کنید و دوباره تلاش کنید.",
      };
    }
    return {
      ok: false,
      message: "ارتباط با سرور برقرار نشد. اتصال شبکه خود را بررسی کنید.",
    };
  } finally {
    clearTimeout(timer);
  }
}
