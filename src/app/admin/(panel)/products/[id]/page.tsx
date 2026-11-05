import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditProduct({ params }: { params: { id: string } }) {
  const sb = createClient();
  const [{ data: product }, { data: cats }] = await Promise.all([
    sb.from("products").select("*, variants(*)").eq("id", params.id).maybeSingle(),
    sb.from("categories").select("*").order("sort_order"),
  ]);
  if (!product) notFound();
  return <ProductForm categories={(cats ?? []) as Category[]} product={product as Product} />;
}
