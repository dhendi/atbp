import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AccountSettingsForm } from "./account-settings-form";
import { TwoFactorSettings } from "./two-factor-settings";
import { DeleteAccountSection } from "./delete-account-section";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Account settings", robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage({ searchParams }: { searchParams: Promise<{ require2fa?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");
  const { require2fa } = await searchParams;

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-8 md:px-6">
      <Link href="/profile" className="mb-4 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800">
        <ChevronLeft size={16} /> Profile
      </Link>
      <h1 className="font-display text-2xl font-semibold text-ink-900">Edit Profile</h1>
      <p className="mt-1 text-sm text-ink-500">Update your name and profile picture.</p>

      <AccountSettingsForm initial={{ name: user.name, avatarUrl: user.avatarUrl }} />

      {user.role === "ADMIN" && (
        <div className="mt-8 border-t border-ink-100 pt-8">
          {require2fa === "1" && (
            <div className="mb-4 rounded-2xl border border-live-300 bg-live-50 p-4">
              <p className="text-sm font-bold text-live-700">Set up two-factor authentication to continue</p>
              <p className="mt-1 text-xs text-live-700">
                Admin accounts now require 2FA. You&apos;ll need it enabled before you can access the admin panel again.
              </p>
            </div>
          )}
          <h2 className="font-display text-lg font-semibold text-ink-900">Security</h2>
          <p className="mt-1 text-sm text-ink-500">Two-factor authentication for your admin account.</p>
          <TwoFactorSettings />
        </div>
      )}
      {user.role !== "ADMIN" && <DeleteAccountSection />}
    </div>
  );
}
