import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";
import { addEvent, markOrderPaid, sendReceipt } from "@/lib/orders";
import { siteUrl } from "@/lib/utils";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("confirm_manual_payment"), note: z.string().min(3).max(300) }),
  z.object({ action: z.literal("set_status"), status: z.enum(["PROCESSING", "IN_TRANSIT", "DELIVERED", "CANCELLED"]), note: z.string().max(300).optional() }),
  z.object({ action: z.literal("dispatch"), driverName: z.string().min(2), driverPhone: z.string().min(9) }),
  z.object({ action: z.literal("resend_receipt") }),
]);

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const b = parsed.data;
  const db = createAdminClient();
  const id = params.id;

  switch (b.action) {
    case "confirm_manual_payment": {
      const r = await markOrderPaid(id, { manualNote: b.note });
      return NextResponse.json({ ok: true, ...r });
    }
    case "set_status": {
      const { data: o } = await db.from("orders").select("status").eq("id", id).single();
      if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Fulfilment can only start once payment is confirmed.
      if (["PENDING_PAYMENT", "FAILED"].includes(o.status) && b.status !== "CANCELLED")
        return NextResponse.json({ error: "Order is not paid yet." }, { status: 409 });
      await db.from("orders").update({ status: b.status }).eq("id", id);
      await addEvent(id, b.status, b.note);
      return NextResponse.json({ ok: true });
    }
    case "dispatch": {
      const token = randomBytes(24).toString("base64url");
      const expires = new Date(Date.now() + 3 * 86400_000).toISOString();
      await db.from("orders").update({
        driver_name: b.driverName,
        driver_phone: b.driverPhone,
        tracker_token: token,
        tracker_expires_at: expires,
        status: "IN_TRANSIT",
      }).eq("id", id).in("status", ["PAID", "PROCESSING", "IN_TRANSIT"]);
      await addEvent(id, "IN_TRANSIT", `Dispatched with driver ${b.driverName}`);
      return NextResponse.json({ ok: true, trackerUrl: `${siteUrl()}/driver/${token}`, expires });
    }
    case "resend_receipt": {
      await sendReceipt(id);
      return NextResponse.json({ ok: true });
    }
  }
}
