import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), id: z.string().uuid() }),
  z.object({ action: z.literal("reject"), id: z.string().uuid() }),
  z.object({ action: z.literal("delete"), id: z.string().uuid() }),
  z.object({ action: z.literal("reply"), id: z.string().uuid(), body: z.string().min(1).max(1000), parentId: z.string().uuid().optional() }),
]);

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const db = createAdminClient();

  if (b.action === "approve") await db.from("reviews").update({ status: "approved" }).eq("id", b.id);
  if (b.action === "reject") await db.from("reviews").update({ status: "rejected" }).eq("id", b.id);
  if (b.action === "delete") await db.from("reviews").delete().eq("id", b.id);
  if (b.action === "reply")
    await db.from("review_replies").insert({
      review_id: b.id,
      parent_id: b.parentId ?? null,
      user_id: auth.user.id,
      author_name: "Store owner",
      is_owner: true,
      body: b.body,
    });

  return NextResponse.json({ ok: true });
}
