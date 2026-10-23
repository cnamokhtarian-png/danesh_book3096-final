import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser, publicUser, type SessionUser } from "@/lib/auth";
import { AVATAR_CHOICES } from "@/lib/constants";
import { HttpError, jsonError, jsonOk, readJsonBody, str, withDb } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);
  return jsonOk({ user: publicUser(user) });
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("ابتدا وارد حساب خود شوید.", 401);

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return jsonError((error as Error).message, 400);
  }

  const fullName = str(body.fullName, 120);
  const studentCode = str(body.studentCode, 40);
  const university = str(body.university, 140);
  const major = str(body.major, 140);
  const bio = str(body.bio, 400);
  const avatarEmoji = str(body.avatarEmoji, 12) || "🎓";

  if (fullName.length < 3) {
    return jsonError("نام و نام خانوادگی باید حداقل ۳ حرف باشد.", 422);
  }
  if (studentCode && !/^[\d\u06F0-\u06F9-]{4,20}$/.test(studentCode)) {
    return jsonError("شماره دانشجویی باید ۴ تا ۲۰ رقم باشد.", 422);
  }
  if (!AVATAR_CHOICES.includes(avatarEmoji as (typeof AVATAR_CHOICES)[number])) {
    return jsonError("آواتار انتخاب‌شده معتبر نیست.", 422);
  }

  const { response } = await withDb(async () => {
    if (studentCode) {
      const taken = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.studentCode, studentCode), ne(users.id, user.id)))
        .limit(1);
      if (taken.length) {
        throw new HttpError("این شماره دانشجویی متعلق به حساب دیگری است.", 409);
      }
    }

    const [updated] = await db
      .update(users)
      .set({
        fullName,
        studentCode: studentCode || null,
        university: university || null,
        major: major || null,
        bio: bio || null,
        avatarEmoji,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
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

    if (!updated) throw new HttpError("به‌روزرسانی پروفایل انجام نشد.", 404);
    return { user: publicUser(updated as SessionUser) };
  });

  return response;
}
