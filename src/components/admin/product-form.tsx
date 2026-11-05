"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { uploadImage } from "@/lib/upload";
import { cldUrl } from "@/lib/cld-url";

type V = { id?: string; label: string; sku: string; price: number; stock: number; weight_kg: number; attributes: Record<string, string> };

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const kvToText = (o: Record<string, string>) => Object.entries(o).map(([k, v]) => `${k}: ${v}`).join("\n");
const textToKv = (t: string) =>
  Object.fromEntries(t.split("\n").map((l) => l.split(/:(.*)/s)).filter((p) => p[0]?.trim() && p[1]?.trim()).map((p) => [p[0].trim(), p[1].trim()]));

export function ProductForm({ categories, product }: { categories: Category[]; product?: Product }) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? categories[0]?.id ?? "");
  const [summary, setSummary] = useState(product?.summary ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [specs, setSpecs] = useState(kvToText(product?.specs ?? {}));
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [active, setActive] = useState(product?.is_active ?? true);
  const [variants, setVariants] = useState<(V & { attrText: string })[]>(
    (product?.variants ?? [{ label: "", sku: "", price: 0, stock: 0, weight_kg: 0, attributes: {} } as any]).map((v: any) => ({ ...v, attrText: kvToText(v.attributes ?? {}) }))
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const patch = (i: number, p: Partial<V & { attrText: string }>) => setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...p } : v)));

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    setBusy(true); setErr("");
    try {
      const urls = await Promise.all(Array.from(e.target.files ?? []).map((f) => uploadImage(f, "products")));
      setImages((p) => [...p, ...urls]);
    } catch (x: any) { setErr(x.message); }
    setBusy(false);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: product?.id, name, slug: slug || slugify(name), category_id: categoryId, summary, description,
        specs: textToKv(specs), images, is_active: active,
        variants: variants.map(({ attrText, ...v }) => ({ ...v, price: Number(v.price), stock: Number(v.stock), weight_kg: Number(v.weight_kg), attributes: textToKv(attrText) })),
      }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error ?? "Could not save");
    router.push("/admin/products");
    router.refresh();
  }

  async function hide() {
    if (!product || !confirm("Hide this product from the store?")) return;
    await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: product.id }) });
    router.push("/admin/products");
    router.refresh();
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-extrabold">{product ? "Edit product" : "New product"}</h1>

      <section className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Name</label><input className="input" required value={name} onChange={(e) => { setName(e.target.value); if (!product) setSlug(slugify(e.target.value)); }} /></div>
          <div><label className="label">Slug</label><input className="input" required pattern="[a-z0-9-]+" value={slug} onChange={(e) => setSlug(e.target.value)} /></div>
        </div>
        <div><label className="label">Category</label><select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div><label className="label">Summary</label><input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} /></div>
        <div><label className="label">Description</label><textarea className="input min-h-28" value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div><label className="label">Specifications (one “Name: value” per line)</label><textarea className="input min-h-24 font-mono" placeholder={"Zinc coating: 60 g/m2\nBarb spacing: 4 inch"} value={specs} onChange={(e) => setSpecs(e.target.value)} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Visible in store</label>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="font-bold">Images (Cloudinary)</h2>
        <div className="flex flex-wrap gap-2">
          {images.map((u, i) => (
            <div key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cldUrl(u, 200)} alt="" className="h-24 w-24 rounded-lg object-cover" />
              {i === 0 && <span className="absolute bottom-1 left-1 rounded bg-primary px-1 text-[10px] font-bold text-primary-fg">MAIN</span>}
              <button type="button" onClick={() => setImages(images.filter((x) => x !== u))} className="absolute -right-1 -top-1 rounded-full bg-danger p-0.5 text-white" aria-label="Remove image"><X size={14} /></button>
            </div>
          ))}
          <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted"><ImagePlus /><input type="file" accept="image/*" multiple className="hidden" onChange={pick} /></label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between"><h2 className="font-bold">Variants (size / gauge / roll length / aperture)</h2>
          <button type="button" className="btn-outline !py-1.5" onClick={() => setVariants([...variants, { label: "", sku: "", price: 0, stock: 0, weight_kg: 0, attributes: {}, attrText: "" }])}><Plus size={16} /> Add</button></div>
        {variants.map((v, i) => (
          <div key={i} className="card space-y-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label">Label</label><input className="input" required placeholder="2.5mm x 200m roll" value={v.label} onChange={(e) => patch(i, { label: e.target.value })} /></div>
              <div><label className="label">SKU</label><input className="input" required value={v.sku} onChange={(e) => patch(i, { sku: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="label">Price (KSh)</label><input className="input" type="number" min={0} step="1" required value={v.price} onChange={(e) => patch(i, { price: Number(e.target.value) })} /></div>
              <div><label className="label">Stock</label><input className="input" type="number" min={0} step="1" required value={v.stock} onChange={(e) => patch(i, { stock: Number(e.target.value) })} /></div>
              <div><label className="label">Weight (kg)</label><input className="input" type="number" min={0} step="0.1" required value={v.weight_kg} onChange={(e) => patch(i, { weight_kg: Number(e.target.value) })} /></div>
            </div>
            <div><label className="label">Attributes (one “key: value” per line, e.g. gauge: 2.5mm)</label><textarea className="input font-mono" value={v.attrText} onChange={(e) => patch(i, { attrText: e.target.value })} /></div>
            {variants.length > 1 && <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="flex items-center gap-1 text-sm text-danger"><Trash2 size={14} /> Remove variant</button>}
          </div>
        ))}
      </section>

      {err && <p className="text-sm text-danger">{err}</p>}
      <div className="flex gap-3">
        <button className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
        {product && <button type="button" onClick={hide} className="btn-outline !border-danger !text-danger">Hide product</button>}
      </div>
    </form>
  );
}
