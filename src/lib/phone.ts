// Pure helper — safe to import from client components (see local-shared.ts
// for the same "no server-only imports" convention).

/** Accepts a PH mobile number as "09XXXXXXXXX" or "+639XXXXXXXXX" (spacing/
 * dashes tolerated) and returns the canonical "+639XXXXXXXXX" form, or null
 * if it doesn't match either shape. This canonical form is what's stored on
 * User.phone and PhoneOtpToken.phone, so every lookup agrees regardless of
 * how the buyer typed it in. */
export function normalizePhMobile(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  return null;
}

// The unusable placeholder findOrCreateByPhone (lib/auth.ts) fills User.email
// with, since it's a required column but a phone-only account never provided
// a real one. Never show this to the user as if it were their email — check
// with this wherever User.email gets displayed.
const PLACEHOLDER_EMAIL_SUFFIX = "@no-email.atbp.local";
export function isPlaceholderEmail(email: string): boolean {
  return email.endsWith(PLACEHOLDER_EMAIL_SUFFIX);
}
