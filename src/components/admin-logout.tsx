"use client";
import { useRouter } from "next/navigation";

export function AdminLogout() {
  const router = useRouter();
  return (
    <button
      className="whitespace-nowrap px-4 py-3 text-sm font-bold text-danger"
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        router.push("/admin/login");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
