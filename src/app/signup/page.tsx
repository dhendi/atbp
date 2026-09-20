import { Suspense } from "react";
import { googleLoginEnabled, facebookLoginEnabled } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm googleEnabled={googleLoginEnabled} facebookEnabled={facebookLoginEnabled} />
    </Suspense>
  );
}
