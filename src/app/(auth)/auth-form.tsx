"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { login, signup, type AuthFormState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form-controls";

export function AuthForm({ mode, next, signupOpen }: { mode: "login" | "signup"; next?: string; signupOpen?: boolean }) {
  const [state, action, pending] = React.useActionState<AuthFormState, FormData>(mode === "login" ? login : signup, {});

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-xl font-semibold">{mode === "login" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Welcome back." : "You'll set up your household in the next step."}
        </p>
        <form action={action} className="mt-6 grid gap-4">
          {next && <input type="hidden" name="next" value={next} />}
          {mode === "signup" && (
            <Field label="Your name" htmlFor="name">
              <Input id="name" name="name" autoComplete="name" required />
            </Field>
          )}
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" defaultValue={state.email} required />
          </Field>
          <Field label="Password" htmlFor="password" hint={mode === "signup" ? "At least 8 characters." : undefined}>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </Field>
          {state.error && (
            <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-sm">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
        {mode === "login" && signupOpen && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="font-medium text-foreground underline underline-offset-2">
              Create an account
            </Link>
          </p>
        )}
        {mode === "signup" && (
          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
              Sign in
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
