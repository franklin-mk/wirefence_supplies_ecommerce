import { createClient } from "@/lib/supabase/server";
import type { Product, Review, ReviewReply } from "@/lib/types";

async function withRatings(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;
  const { data } = await createClient()
    .from("product_ratings")
    .select("product_id,rating_avg,rating_count")
    .in("product_id", products.map((p) => p.id));
  const map = new Map((data ?? []).map((r: any) => [r.product_id, r]));
  return products.map((p) => {
    const r: any = map.get(p.id);
    return { ...p, rating_avg: r ? Number(r.rating_avg) : 0, rating_count: r ? Number(r.rating_count) : 0 };
  });
}

export async function getProducts(opts: { category?: string; q?: string } = {}): Promise<Product[]> {
  const sb = createClient();
  let query = sb
    .from("products")
    .select("*, variants(*), category:categories(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (opts.category) {
    const { data: c } = await sb.from("categories").select("id").eq("slug", opts.category).maybeSingle();
    if (!c) return [];
    query = query.eq("category_id", c.id);
  }
  if (opts.q) {
    const q = opts.q.replace(/[%,()*]/g, " ").trim();
    if (q) query = query.or(`name.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  const { data } = await query;
  return withRatings((data ?? []) as Product[]);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await createClient()
    .from("products")
    .select("*, variants(*), category:categories(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) return null;
  const [p] = await withRatings([data as Product]);
  p.variants = [...p.variants].sort((a, b) => Number(a.price) - Number(b.price));
  return p;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (!ids.length) return [];
  const { data } = await createClient()
    .from("products")
    .select("*, variants(*), category:categories(*)")
    .in("id", ids)
    .eq("is_active", true);
  return withRatings((data ?? []) as Product[]);
}

export async function getRelated(product: Product, limit = 4): Promise<Product[]> {
  const { data } = await createClient()
    .from("products")
    .select("*, variants(*), category:categories(*)")
    .eq("category_id", product.category_id)
    .eq("is_active", true)
    .neq("id", product.id)
    .limit(limit);
  return withRatings((data ?? []) as Product[]);
}

export async function getReviews(productId: string): Promise<Review[]> {
  const sb = createClient();
  const { data: reviews } = await sb
    .from("reviews")
    .select("*")
    .eq("product_id", productId)
    .order("created_at", { ascending: false });
  if (!reviews?.length) return [];
  const { data: replies } = await sb
    .from("review_replies")
    .select("*")
    .in("review_id", reviews.map((r: any) => r.id))
    .order("created_at");
  return reviews.map((r: any) => ({
    ...r,
    replies: ((replies ?? []) as ReviewReply[]).filter((x) => x.review_id === r.id),
  }));
}

export const minPrice = (p: Product) => (p.variants.length ? Math.min(...p.variants.map((v) => Number(v.price))) : 0);
