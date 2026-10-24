/**
 * Tiny HTTP + error-handling helpers.
 * Every API route funnels DB work through `withDb` so users always receive a
 * readable Persian message instead of an opaque 500 error.
 */

export const DB_TIMEOUT_MS = 12_000;

export type DbResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; status: number };

export function jsonOk<T>(data: T, status = 200) {
  return Response.json({ ok: true, ...(data as object) }, { status });
}

export function jsonError(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...extra }, { status });
}

export class HttpError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Parses a JSON body defensively (never throws on malformed payloads). */
export async function readJsonBody<T extends Record<string, unknown>>(
  request: Request,
): Promise<T> {
  try {
    const raw = await request.text();
    if (!raw.trim()) return {} as T;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {} as T;
    return parsed as T;
  } catch {
    throw new HttpError("داده‌های ارسالی نامعتبر است. لطفاً فرم را دوباره بررسی کنید.", 400);
  }
}

/**
 * Drizzle خطای درایور را در یک خطای بیرونی می‌پیچد، بنابراین `code` و پیام
 * واقعی در `error.cause` قرار می‌گیرند. بدون پیمایش زنجیره cause، هیچ‌یک از
 * نگاشت‌های زیر (۲۳۵۰۵، ECONNREFUSED، timeout و …) هرگز فعال نمی‌شد و همه
 * خطاها به ۵۰۰ مبهم تبدیل می‌شدند. این تابع تا چهار سطح پایین می‌رود.
 */
type ErrorLike = { code?: unknown; message?: unknown; name?: unknown; cause?: unknown };

function errorChain(error: unknown): ErrorLike[] {
  const chain: ErrorLike[] = [];
  let current = error as ErrorLike | null | undefined;
  for (let depth = 0; current && depth < 5; depth += 1) {
    if (typeof current !== "object") break;
    chain.push(current);
    current = current.cause as ErrorLike | null | undefined;
  }
  return chain;
}

function firstString(
  chain: ErrorLike[],
  key: "code" | "message" | "name",
): string | undefined {
  for (const link of chain) {
    const value = link?.[key];
    if (typeof value === "string" && value) return value;
  }
  return undefined;
}

function describeDbError(error: unknown): { message: string; status: number } {
  const err = error as ErrorLike | null;

  if (err instanceof HttpError) {
    return { message: err.message, status: err.status };
  }

  const chain = errorChain(error);
  const code = firstString(chain, "code");
  const name = firstString(chain, "name");

  switch (code) {
    case "23505":
      return {
        message: "این ایمیل یا شماره دانشجویی قبلاً ثبت شده است.",
        status: 409,
      };
    case "23503":
      return {
        message: "رکورد مورد نظر پیدا نشد یا حذف شده است.",
        status: 404,
      };
    case "23502":
      return { message: "یک یا چند فیلد الزامی خالی مانده است.", status: 400 };
    case "23514":
      return { message: "مقادیر وارد شده با قوانین دیتابیس هم‌خوانی ندارد.", status: 400 };
    case "42P01":
      return {
        message: "جدول‌های دیتابیس ساخته نشده‌اند. دستور drizzle-kit push را اجرا کنید.",
        status: 503,
      };
    case "ECONNREFUSED":
    case "ENOTFOUND":
    case "ETIMEDOUT":
    case "ECONNRESET":
    case "28P01":
    case "3D000":
    case "DB_NOT_CONFIGURED":
      return {
        message:
          "ارتباط با سرور دیتابیس برقرار نشد. چند لحظه بعد دوباره تلاش کنید.",
        status: 503,
      };
    default:
      break;
  }

  const message = firstString(chain, "message")?.toLowerCase() ?? "";
  if (
    message.includes("etimedout") ||
    message.includes("timeout") ||
    message.includes("statement terminated") ||
    message.includes("connection terminated") ||
    message.includes("terminating connection") ||
    name === "AbortError" ||
    name === "TimeoutError"
  ) {
    return {
      message:
        "پاسخ سرور بیش از حد انتظار طول کشید. اتصال اینترنت خود را بررسی کرده و دوباره تلاش کنید.",
      status: 504,
    };
  }

  // پیام‌های داخلی (SQL و مشخصات اتصال) هرگز نباید به کاربر برگردند.
  console.error("[daneshbook:api] unexpected error:", error);
  return {
    message: "خطای غیرمنتظره‌ای رخ داد. لطفاً یک بار دیگر تلاش کنید.",
    status: 500,
  };
}

/**
 * Runs a database operation with a hard timeout and converts any failure into
 * a user-friendly JSON response.
 */
export async function withDb<T>(
  handler: (signal: AbortSignal) => Promise<T>,
): Promise<{ result: DbResult<T>; response: Response }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DB_TIMEOUT_MS);
  try {
    const data = await handler(controller.signal);
    if (controller.signal.aborted) {
      throw new Error("query timeout");
    }
    return { result: { ok: true, data }, response: jsonOk(data) };
  } catch (error) {
    const { message, status } = describeDbError(error);
    return { result: { ok: false, message, status }, response: jsonError(message, status) };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------ validators ------------------------------ */

export function str(value: unknown, max = 500): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function toInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number.parseInt(str(value, 20), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}
