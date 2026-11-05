import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckoutForm } from "@/components/checkout-form";

export default async function CheckoutPage() {
  const { data } = await createClient().auth.getUser();
  const user = data.user;
  if (!user) redirect("/login?next=/checkout");
  return (
    <CheckoutForm
      email={user.email!}
      verified={!!user.email_confirmed_at}
      defaultName={(user.user_metadata?.full_name as string) ?? ""}
    />
  );
}
