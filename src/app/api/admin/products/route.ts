import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { requireAdmin } from "@/lib/guards";
import { createAdminClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(val: unknown): val is string {
  return typeof val === "string" && UUID_REGEX.test(val);
}

const variant = z.object({
  id: z.string().optional().nullable(),
  label: z.string().min(1, "Label is required"),
  sku: z.string().min(1, "SKU is required"),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  weight_kg: z.coerce.number().min(0).default(0),
  attributes: z.record(z.string()).default({}),
});

const product = z.object({
  id: z.string().optional().nullable(),
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  category_id: z.string().uuid(),
  summary: z.string().default(""),
  description: z.string().default(""),
  specs: z.record(z.string()).default({}),
  images: z.array(z.string()).default([]),
  is_active: z.boolean().default(true),
  variants: z.array(variant).min(1),
});

/** Create or update a product together with its variants. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const body = await req.json();
  const parsed = product.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid product payload", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { variants, id, ...p } = parsed.data;
  const db = createAdminClient();

  const productId = isValidUUID(id) ? id : undefined;
  let finalProductId = productId;

  // 1. Insert or Update Product
  if (productId) {
    const { error } = await db.from("products").update(p).eq("id", productId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const { data, error } = await db.from("products").insert(p).select("id").single();
    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create product" },
        { status: 400 }
      );
    }
    finalProductId = data.id;
  }

  // 2. Identify existing valid UUID variant IDs to keep
  const keepIds = variants
    .map((v) => v.id)
    .filter((vId): vId is string => isValidUUID(vId));

  // 3. Delete any variants removed from the form
  if (productId) {
    if (keepIds.length > 0) {
      await db
        .from("variants")
        .delete()
        .eq("product_id", productId)
        .not("id", "in", `(${keepIds.join(",")})`);
    } else {
      await db.from("variants").delete().eq("product_id", productId);
    }
  }

  // 4. Ensure EVERY row has a valid UUID primary key before upserting
  const rows = variants.map((v) => ({
    id: isValidUUID(v.id) ? v.id : randomUUID(),
    product_id: finalProductId,
    label: v.label,
    sku: v.sku,
    price: v.price,
    stock: v.stock,
    weight_kg: v.weight_kg,
    attributes: v.attributes,
  }));

  // 5. Upsert batch (No missing ID keys = No NULL constraint errors)
  const { error: vErr } = await db.from("variants").upsert(rows);
  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: finalProductId });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;
  const { id } = await req.json();
  // Soft-delete keeps historical order items intact.
  await createAdminClient().from("products").update({ is_active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}