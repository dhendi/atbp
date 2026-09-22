import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Request a password reset link for your ATBP account.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
