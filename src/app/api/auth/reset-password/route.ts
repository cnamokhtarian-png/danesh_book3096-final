import { HttpError, jsonError, readJsonBody, str, withDb } from "@/lib/http";
import { passwordProblem } from "@/lib/auth";
import { consumeResetToken } from "@/lib/password-reset";
import { createRateLimiter, rateKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const limiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 6 });

export async function POST(request: Request) {
  let body: { token?: unknown; password?: unknown };
  try {
    body = await readJsonBody<{ token?: unknown; password?: unknown }>(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const token = str(body.token, 64);
  const password = str(body.password, 200);

  if (!token) return jsonError("لینک بازیابی نامعتبر است. دوباره درخواست دهید.", 422);
  const weak = passwordProblem(password);
  if (weak) return jsonError(weak, 422);

  const key = rateKey(request, "reset");
  if (limiter.isLimited(key)) {
    return jsonError("تلاش‌های زیاد از این دستگاه. کمی بعد دوباره تلاش کنید.", 429);
  }
  limiter.register(key);

  const { response } = await withDb(async () => {
    const result = await consumeResetToken(token, password);
    if (!result) {
      throw new HttpError(
        "این لینک بازیابی معتبر نیست یا منقضی شده است. لطفاً دوباره درخواست دهید.",
        400,
      );
    }
    return { message: "رمز عبور شما تغییر کرد. اکنون می‌توانید وارد شوید." };
  });

  return response;
}
