"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stars } from "@/components/stars";
import { cldUrl } from "@/lib/cld-url";

type R = { id: string; rating: number; body: string; author_name: string; status: string; images: string[]; created_at: string; products?: { name: string } };
type Rep = { id: string; review_id: string; author_name: string; is_owner: boolean; body: string };

export function ReviewModerator({ reviews, replies }: { reviews: R[]; replies: Rep[] }) {
  const router = useRouter();
  const [reply, setReply] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function act(body: object) {
    setBusy(true);
    await fetch("/api/admin/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setBusy(false);
    router.refresh();
  }

  if (!reviews.length) return <p className="card p-6 text-center text-muted">No reviews yet.</p>;
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <article key={r.id} className="card space-y-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm"><b>{r.author_name}</b> on <span className="text-muted">{r.products?.name}</span></p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${r.status === "approved" ? "bg-success/20 text-success" : r.status === "pending" ? "bg-accent/20" : "bg-danger/20 text-danger"}`}>{r.status}</span>
          </div>
          <Stars value={r.rating} />
          <p className="whitespace-pre-wrap text-sm">{r.body}</p>
          {r.images.length > 0 && <div className="flex gap-2">{r.images.map((u) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={u} src={cldUrl(u, 150)} alt="" className="h-16 w-16 rounded-lg object-cover" />)}</div>}
          {replies.filter((x) => x.review_id === r.id).map((x) => (
            <p key={x.id} className="ml-3 border-l border-border pl-3 text-sm"><b>{x.author_name}{x.is_owner ? " (owner)" : ""}:</b> {x.body}</p>
          ))}
          <div className="flex gap-2">
            <input className="input" placeholder="Reply as store owner…" value={reply[r.id] ?? ""} onChange={(e) => setReply({ ...reply, [r.id]: e.target.value })} />
            <button className="btn-outline !py-2" disabled={busy || !reply[r.id]?.trim()} onClick={() => act({ action: "reply", id: r.id, body: reply[r.id] }).then(() => setReply({ ...reply, [r.id]: "" }))}>Reply</button>
          </div>
          <div className="flex gap-3 text-sm font-semibold">
            {r.status !== "approved" && <button className="text-success" disabled={busy} onClick={() => act({ action: "approve", id: r.id })}>Approve</button>}
            {r.status !== "rejected" && <button className="text-muted" disabled={busy} onClick={() => act({ action: "reject", id: r.id })}>Reject</button>}
            <button className="text-danger" disabled={busy} onClick={() => confirm("Delete this review?") && act({ action: "delete", id: r.id })}>Delete</button>
          </div>
        </article>
      ))}
    </div>
  );
}
