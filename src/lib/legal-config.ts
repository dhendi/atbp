/**
 * Centralized legal/compliance identity for the Terms of Service and Privacy
 * Policy — the single place that names ATBP's registered legal entity,
 * address, and privacy contact, so those facts live in exactly one file
 * instead of being retyped (and able to drift) across two long legal pages.
 *
 * IMPORTANT: every `FILL_IN_*` value below is a deliberate placeholder, not a
 * guess. Nobody should invent a business name, address, or DPO — the owner
 * fills these in once the entity's actual registration is confirmed. Until
 * then, Terms/Privacy render the raw placeholder text, visibly highlighted
 * (see the `Placeholder` component in both pages), so it's obvious on the
 * live site that these are still outstanding rather than silently wrong.
 */

const FILL_IN_ENTITY_NAME = "[LEGAL ENTITY NAME — e.g. \"ATBP Marketplace, Inc.\" or the registered sole proprietorship name]";
const FILL_IN_ENTITY_ADDRESS = "[REGISTERED BUSINESS ADDRESS, PHILIPPINES]";
const FILL_IN_GOVERNING_CITY = "[CITY where the registered office sits, for venue/jurisdiction clauses]";
const FILL_IN_DPO = "[DPO NAME, or \"the Privacy Contact below\" once a Data Protection Officer is formally designated per NPC Circular 16-01]";

export const LEGAL_CONFIG = {
  /** The registered legal entity operating ATBP (a corporation, OPC, or sole
   * proprietorship's registered name) — see the SEC-vs-DTI registration
   * conversation this same owner already had about which entity type fits.
   * Not "ATBP" itself, which is a trade name/brand, not a legal person. */
  entityName: FILL_IN_ENTITY_NAME,
  /** Registered office address as it will appear on SEC/DTI/BIR paperwork. */
  entityAddress: FILL_IN_ENTITY_ADDRESS,
  /** The city whose courts have venue for disputes under the Terms — normally
   * wherever the registered office sits, but confirm with counsel since venue
   * clauses can be drafted for the owner's convenience within limits. */
  governingCity: FILL_IN_GOVERNING_CITY,
  /** General privacy/legal contact — already real and receiving mail. Kept
   * here (not hardcoded per-page) so a future change to the support inbox
   * only needs updating in one place. */
  privacyContactEmail: "contact@atbph.com",
  /** No Data Protection Officer is formally designated yet. NPC Circular
   * 16-01 requires one designated privacy contact at minimum (a full DPO
   * isn't mandatory for every organization, but a contact person is) — until
   * that designation happens, the Privacy Policy names this placeholder
   * rather than inventing a person, and directs data subjects to
   * privacyContactEmail in the meantime, which is real and already staffed. */
  dpoNameOrContact: FILL_IN_DPO,
} as const;

/** True once every placeholder above has been replaced with a real value —
 * lets a page detect "is this still a draft?" without string-matching each
 * field individually. Update the bracketed markers together if this check
 * ever needs to change. */
export function legalConfigIsComplete(): boolean {
  return Object.values(LEGAL_CONFIG).every((v) => !v.startsWith("["));
}
