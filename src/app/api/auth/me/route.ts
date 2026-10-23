import { destroySession, getCurrentUser, publicUser } from "@/lib/auth";
import { jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonOk({ user: null });
  return jsonOk({ user: publicUser(user) });
}

export async function DELETE() {
  await destroySession();
  return jsonOk({ user: null });
}
