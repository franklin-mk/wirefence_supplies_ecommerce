import { AuthForm } from "@/components/auth-form";

export default function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  return <AuthForm mode="register" next={searchParams.next ?? null} />;
}
