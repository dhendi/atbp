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
    <Suspense>
      <LoginForm googleEnabled={googleLoginEnabled} facebookEnabled={facebookLoginEnabled} />
    </Suspense>
  );
}
