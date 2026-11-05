import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLogout } from "@/components/admin-logout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sb = createClient();
  const { data } = await sb.auth.getUser();
  if (!data.user) redirect("/admin/login");
  // Middleware already checked the OTP cookie; here we enforce the RBAC role.
  const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const links = [
    ["/admin", "Dashboard"], ["/admin/products", "Products"], ["/admin/orders", "Orders"], ["/admin/reviews", "Reviews"],
  ];
  return (
    <div>
      <div className="no-scrollbar mb-6 flex items-center gap-1 overflow-x-auto border-b border-border">
        {links.map(([href, label]) => (
          <Link key={href} href={href} className="whitespace-nowrap px-4 py-3 text-sm font-bold text-muted hover:text-primary">{label}</Link>
        ))}
        <span className="flex-1" />
        <AdminLogout />
      </div>
      {children}
    </div>
  );
}
