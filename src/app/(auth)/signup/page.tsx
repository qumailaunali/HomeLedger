import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { signupAllowed } from "@/server/actions/auth";
import { Card, CardContent } from "@/components/ui/card";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage() {
  await connection(); // decided per request, never at build time
  if (!(await signupAllowed().catch(() => false))) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h1 className="text-lg font-semibold">Sign-ups are closed</h1>
          <p className="mt-2 text-sm text-muted-foreground">This household is already set up. Ask the owner for access.</p>
          <Link href="/login" className="mt-4 inline-block text-sm font-medium underline underline-offset-2">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }
  return <AuthForm mode="signup" />;
}
