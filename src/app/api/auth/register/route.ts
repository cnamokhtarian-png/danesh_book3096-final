import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, hashPassword, publicUser, type SessionUser } from "@/lib/auth";
import { HttpError, jsonError, readJsonBody, str, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  studentCode?: unknown;
  university?: unknown;
  major?: unknown;
};

export async function POST(request: Request) {
  // ---- 1. read & validate the body (never trusts malformed input) ----
  let body: Payload;
  try {
    body = await readJsonBody<Payload>(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const fullName = str(body.fullName, 120);
  const email = str(body.email, 190).toLowerCase();
  const password = str(body.password, 200);
  const studentCode = str(body.studentCode, 40);
  const university = str(body.university, 140);
  const major = str(body.major, 140);

  if (fullName.length < 3) {
    return jsonError("نام و نام خانوادگی باید حداقل ۳ حرف باشد.", 422);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return jsonError("ایمیل وارد شده معتبر نیست.", 422);
  }
  if (password.length < 6) {
    return jsonError("رمز عبور باید حداقل ۶ کاراکتر باشد.", 422);
  }
  if (studentCode && !/^[\d\u06F0-\u06F9-]{4,20}$/.test(studentCode)) {
    return jsonError("شماره دانشجویی باید ۴ تا ۲۰ رقم باشد.", 422);
  }

  // ---- 2. all DB work runs through withDb → readable errors, no 500s ----
  const { response } = await withDb(async () => {
    const duplicates = await db
      .select({ id: users.id, email: users.email, studentCode: users.studentCode })
      .from(users)
      .where(
        studentCode
          ? or(eq(users.email, email), eq(users.studentCode, studentCode))
          : eq(users.email, email),
      )
      .limit(1);

    const duplicate = duplicates[0];
    if (duplicate) {
      if (duplicate.email === email) {
        throw new HttpError("با این ایمیل قبلاً حساب ساخته شده است. وارد شوید.", 409);
      }
      throw new HttpError("این شماره دانشجویی قبلاً ثبت شده است.", 409);
    }

    const passwordHash = await hashPassword(password);

    const [created] = await db
      .insert(users)
      .values({
        fullName,
        email,
        passwordHash,
        studentCode: studentCode || null,
        university: university || null,
        major: major || null,
        avatarEmoji: "🎓",
        // `karmaPoints` is the real column name in the users table.
        karmaPoints: 20,
      })
      .returning({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        studentCode: users.studentCode,
        university: users.university,
        major: users.major,
        bio: users.bio,
        avatarEmoji: users.avatarEmoji,
        karmaPoints: users.karmaPoints,
        role: users.role,
        createdAt: users.createdAt,
      });

    await createSession(created.id);
    return { user: publicUser(created as SessionUser) };
  });

  return response;
}
