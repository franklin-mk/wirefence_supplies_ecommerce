"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImagePlus, Star } from "lucide-react";
import type { Review, ReviewReply } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/upload";
import { cldUrl } from "@/lib/cld-url";
import { Stars } from "@/components/stars";

const when = (d: string) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

function Breakdown({ reviews }: { reviews: Review[] }) {
  const approved = reviews.filter((r) => r.status === "approved");
  const total = approved.length;
  const avg = total ? approved.reduce((n, r) => n + r.rating, 0) / total : 0;
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="text-center sm:w-40">
        <p className="text-5xl font-extrabold">{avg.toFixed(1)}</p>
        <Stars value={avg} size={18} />
        <p className="mt-1 text-sm text-muted">{total} review{total === 1 ? "" : "s"}</p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = approved.filter((r) => r.rating === n).length;
          return (
            <div key={n} className="flex items-center gap-2 text-sm">
              <span className="w-3">{n}</span><Star size={12} className="fill-accent text-accent" />
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-border"><div className="h-full bg-accent" style={{ width: total ? `${(c / total) * 100}%` : 0 }} /></div>
              <span className="w-6 text-right text-muted">{c}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReplyForm({ reviewId, parentId, onDone }: { reviewId: string; parentId: string | null; onDone: () => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setErr("");
    const sb = createClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) { setErr("Please sign in to reply."); setBusy(false); return; }
    const name = (data.user.user_metadata?.full_name as string) || data.user.email!.split("@")[0];
    const { error } = await sb.from("review_replies").insert({
      review_id: reviewId, parent_id: parentId, user_id: data.user.id, author_name: name, is_owner: false, body: body.trim(),
    });
    setBusy(false);
    if (error) return setErr(error.message);
    setBody("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <input className="input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write a reply…" maxLength={1000} />
      <button className="btn-primary !py-2" disabled={busy}>Reply</button>
      {err && <span className="self-center text-xs text-danger">{err}</span>}
    </form>
  );
}

function Thread({ replies, review, parentId, depth, refresh }: { replies: ReviewReply[]; review: Review; parentId: string | null; depth: number; refresh: () => void }) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const children = replies.filter((r) => r.parent_id === parentId);
  if (!children.length) return null;
  return (
    <div className={depth > 0 ? "ml-4 border-l border-border pl-3" : "mt-3 space-y-3"}>
      {children.map((r) => (
        <div key={r.id} className="space-y-1">
          <div className="rounded-lg bg-bg p-3 text-sm">
            <p className="mb-0.5 font-semibold">
              {r.author_name}
              {r.is_owner && <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-fg">OWNER</span>}
              <span className="ml-2 text-xs font-normal text-muted">{when(r.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap">{r.body}</p>
            {depth < 3 && <button onClick={() => setReplyTo(replyTo === r.id ? null : r.id)} className="mt-1 text-xs font-semibold text-primary">Reply</button>}
          </div>
          {replyTo === r.id && <ReplyForm reviewId={review.id} parentId={r.id} onDone={() => { setReplyTo(null); refresh(); }} />}
          <Thread replies={replies} review={review} parentId={r.id} depth={depth + 1} refresh={refresh} />
        </div>
      ))}
    </div>
  );
}

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [user, setUser] = useState<{ id: string; name: string } | null | undefined>(undefined);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u ? { id: u.id, name: (u.user_metadata?.full_name as string) || u.email!.split("@")[0] } : null);
    });
  }, []);

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 4 - images.length);
    setBusy(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadImage(f, "reviews")));
      setImages((p) => [...p, ...urls]);
    } catch (err: any) { setMsg(err.message); }
    setBusy(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!rating) return setMsg("Please choose a star rating.");
    setBusy(true);
    const { error } = await createClient().from("reviews").insert({
      product_id: productId, user_id: user.id, author_name: user.name, rating, body: body.trim(), images, status: "pending",
    });
    setBusy(false);
    if (error) return setMsg(error.message);
    setRating(0); setBody(""); setImages([]);
    setMsg("Thanks! Your review will appear once approved.");
    onDone();
  }

  if (user === undefined) return null;
  if (user === null)
    return <p className="card p-4 text-sm">Want to share your experience? <Link className="font-bold text-primary" href={`/login?next=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`}>Sign in</Link> to write a review.</p>;

  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <p className="font-bold">Write a review</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}>
            <Star size={26} className={n <= rating ? "fill-accent text-accent" : "text-border"} />
          </button>
        ))}
      </div>
      <textarea className="input min-h-24" required minLength={5} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder="How was the product and delivery?" />
      <div className="flex flex-wrap items-center gap-2">
        {images.map((u) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={u} src={cldUrl(u, 150)} alt="" className="h-16 w-16 rounded-lg object-cover" />
        ))}
        {images.length < 4 && (
          <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border text-muted">
            <ImagePlus size={20} /><input type="file" accept="image/*" multiple className="hidden" onChange={pick} />
          </label>
        )}
      </div>
      {msg && <p className="text-sm text-muted">{msg}</p>}
      <button className="btn-primary" disabled={busy}>{busy ? "Please wait…" : "Submit review"}</button>
    </form>
  );
}

export function Reviews({ productId, reviews }: { productId: string; reviews: Review[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();
  const [replying, setReplying] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const visible = reviews;

  return (
    <div className="space-y-6">
      <Breakdown reviews={reviews} />
      <ReviewForm productId={productId} onDone={refresh} />
      <div className="space-y-4">
        {visible.length === 0 && <p className="text-muted">No reviews yet. Be the first!</p>}
        {visible.map((r) => (
          <article key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-bold">{r.author_name}</p>
              <span className="text-xs text-muted">{when(r.created_at)}</span>
            </div>
            <Stars value={r.rating} />
            {r.status === "pending" && <span className="ml-2 rounded bg-accent/20 px-2 py-0.5 text-xs font-semibold">Awaiting approval (only you can see this)</span>}
            <p className="mt-2 whitespace-pre-wrap text-sm">{r.body}</p>
            {r.images.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {r.images.map((u) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <button key={u} onClick={() => setLightbox(u)}><img src={cldUrl(u, 200)} alt="Customer photo" className="h-20 w-20 rounded-lg object-cover" /></button>
                ))}
              </div>
            )}
            <Thread replies={r.replies ?? []} review={r} parentId={null} depth={0} refresh={refresh} />
            {r.status === "approved" && (
              <>
                <button onClick={() => setReplying(replying === r.id ? null : r.id)} className="mt-3 text-sm font-semibold text-primary">Reply</button>
                {replying === r.id && <ReplyForm reviewId={r.id} parentId={null} onDone={() => { setReplying(null); refresh(); }} />}
              </>
            )}
          </article>
        ))}
      </div>
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cldUrl(lightbox, 1400)} alt="" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
