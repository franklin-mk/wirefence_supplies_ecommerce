import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/guards";
import { signUpload } from "@/lib/cloudinary";

/** scope=products needs an admin; scope=reviews needs any signed-in user. */
export async function POST(req: Request) {
  const { scope } = await req.json();
  if (scope === "products") {
    const a = await requireAdmin();
    if ("error" in a) return a.error;
    return NextResponse.json(signUpload("wirefence/products"));
  }
  if (scope === "reviews") {
    const u = await requireUser();
    if ("error" in u) return u.error;
    return NextResponse.json(signUpload("wirefence/reviews"));
  }
  return NextResponse.json({ error: "Bad scope" }, { status: 400 });
}
