/** Role stored on an anonymized (deleted) account. It can never sign in. */
export const DELETED_ROLE = "DELETED";

/** Roles that must be refused at every login path and at session refresh:
 * admin-suspended accounts and deleted ones. */
export function isBlockedRole(role: string | null | undefined): boolean {
  return role === "SUSPENDED" || role === DELETED_ROLE;
}
