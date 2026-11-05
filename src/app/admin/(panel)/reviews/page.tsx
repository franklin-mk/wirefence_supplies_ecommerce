import { createClient } from "@/lib/supabase/server";
import { ReviewModerator } from "@/components/admin/review-moderator";

export const dynamic = "force-dynamic";

export default async function AdminReviews() {
  const sb = createClient();
  const { data: reviews } = await sb.from("reviews").select("*, products(name)").order("created_at", { ascending: false }).limit(100);
  const { data: replies } = await sb.from("review_replies").select("*").in("review_id", (reviews ?? []).map((r: any) => r.id)).order("created_at");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">Review moderation</h1>
      <ReviewModerator reviews={(reviews ?? []) as any} replies={(replies ?? []) as any} />
    </div>
  );
}
