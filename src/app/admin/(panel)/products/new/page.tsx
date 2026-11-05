import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import type { Category } from "@/lib/types";

export default async function NewProduct() {
  const { data } = await createClient().from("categories").select("*").order("sort_order");
  return <ProductForm categories={(data ?? []) as Category[]} />;
}
