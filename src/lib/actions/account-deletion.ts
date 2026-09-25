"use server";

import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { anonymizeAccount, getAccountDeletionBlockers } from "@/lib/services/account-deletion";

/** What would stop the signed-in person from deleting their own account right
 * now — shown up front so they aren't surprised by a refusal at the end. */
export async function getMyDeletionBlockersAction() {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  return { blockers: await getAccountDeletionBlockers(session.user.id) };
}

/** Self-service account deletion: anonymizes the caller's own account and
 * signs them out everywhere (the session dies on its next request, since the
 * role becomes DELETED). Only ever acts on the caller's own id. */
export async function deleteMyAccountAction(confirmText: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (session.user.role === "ADMIN") return { error: "Admin accounts can't be deleted." };
  if (confirmText.trim() !== "DELETE") return { error: "Type DELETE to confirm." };

  if (!(await checkRateLimit(`delete-account:${session.user.id}`, 5, 60 * 60_000))) {
    return { error: "Too many attempts. Please try again later." };
  }

  const blockers = await getAccountDeletionBlockers(session.user.id);
  if (blockers.length > 0) {
    return { error: `You can't delete your account yet: ${blockers.join("; ")}.` };
  }

  const result = await anonymizeAccount(session.user.id);
  if ("error" in result) return result;
  return { success: true as const };
}
