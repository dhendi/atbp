import { Suspense } from "react";
import type { Metadata } from "next";
import { googleLoginEnabled, facebookLoginEnabled } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log In",
  description: "Log in to your ATBP account.",
};

export default function LoginPage() {
  return (
    <>
    {/* The form below renders client-side, so the page needs its own heading in the server HTML. */}
    <h1 className="sr-only">Log in to ATBP</h1>
    <Suspense>
      <LoginForm googleEnabled={googleLoginEnabled} facebookEnabled={facebookLoginEnabled} />
    </Suspense>
    </>
  );
}
