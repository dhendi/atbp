import { Suspense } from "react";
import type { Metadata } from "next";
import { googleLoginEnabled, facebookLoginEnabled } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create your ATBP account to start shopping or selling.",
};

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm googleEnabled={googleLoginEnabled} facebookEnabled={facebookLoginEnabled} />
    </Suspense>
  );
}
