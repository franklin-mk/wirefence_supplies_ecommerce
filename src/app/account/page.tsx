import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AccountPage() {
  const { data } = await createClient().auth.getUser();
  const user = data.user;

  if (!user)
    return (
      <div className="mx-auto max-w-sm space-y-3 text-center">
        <h1 className="text-2xl font-extrabold">Your account</h1>
        <p className="text-muted">Sign in to see orders, track deliveries and sync your wishlist.</p>
        <Link href="/login" className="btn-primary w-full">Sign in</Link>
        <Link href="/register" className="btn-outline w-full">Create account</Link>
      </div>
    );

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-extrabold">Your account</h1>
      <div className="card space-y-1 p-4 text-sm">
        <p><span className="text-muted">Name:</span> <b>{(user.user_metadata?.full_name as string) ?? "—"}</b></p>
        <p><span className="text-muted">Email:</span> <b>{user.email}</b></p>
        <p><span className="text-muted">Email verified:</span> <b className={user.email_confirmed_at ? "text-success" : "text-danger"}>{user.email_confirmed_at ? "Yes" : "No"}</b></p>
      </div>
      <Link href="/orders" className="btn-primary w-full">My orders</Link>
      <SignOutButton />
    </div>
  );
}
