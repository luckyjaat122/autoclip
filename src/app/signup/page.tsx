import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth/AuthForm";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
