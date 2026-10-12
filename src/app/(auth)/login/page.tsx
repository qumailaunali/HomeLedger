import type { Metadata } from "next";
import { signupAllowed } from "@/server/actions/auth";
import { str, type SearchParams } from "@/server/params";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const next = str(await searchParams, "next");
  const open = await signupAllowed().catch(() => false);
  return <AuthForm mode="login" next={next} signupOpen={open} />;
}
