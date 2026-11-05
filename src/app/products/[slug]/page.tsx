import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated, getReviews } from "@/lib/catalog";
import { ProductView } from "@/components/product-view";
import { ProductCard } from "@/components/product-card";
import { cldUrl } from "@/lib/cld-url";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await getProductBySlug(params.slug);
  if (!p) return { title: "Product not found" };
  return { title: p.name, description: p.summary, openGraph: { images: p.images[0] ? [cldUrl(p.images[0], 1200)] : [] } };
}

export default async function ProductPage({ params, searchParams }: { params: { slug: string }; searchParams: { variant?: string } }) {
  const product = await getProductBySlug(params.slug);
  if (!product) notFound();
  const [reviews, related] = await Promise.all([getReviews(product.id), getRelated(product)]);

  return (
    <div className="space-y-12">
      <nav className="text-sm text-muted">
        <Link href="/" className="hover:text-primary">Home</Link> / {product.category && <Link href={`/?category=${product.category.slug}`} className="hover:text-primary">{product.category.name}</Link>} / <span className="text-fg">{product.name}</span>
      </nav>
      <ProductView product={product} reviews={reviews} initialVariantId={searchParams.variant} />
      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-extrabold">Related products</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
