# ATBP — Data Breach & Security Incident Response Procedure

**Internal document. Do not publish or link from any public page.** This exists to give whoever is on call a concrete checklist during an actual incident, and to document the process the Privacy Policy's public breach-notification commitment relies on. It complements, not replaces, the codebase's own security posture (see the security audit work already done on rate limiting, 2FA, ID verification, and the fraud-flag system).

This is an internal procedure, not legal advice. Section 6 in particular needs confirmation from a Philippine lawyer or privacy professional before being relied on in an actual incident — the timing and content of an NPC notification is a legal determination, not an engineering one.

## 1. Detection

Sources that might surface an incident, roughly in order of how it's likely to show up:

- Sentry error alerts showing an unexpected pattern (e.g., a spike in failed auth attempts, an unhandled error in a data-access path)
- The audit log (`AdminAuditLog`, written by `logAdminAction` on nearly every admin mutation) showing an action pattern that doesn't match any known admin's normal behavior
- A report from a user, a seller, or a third party (including a security researcher) that something looks wrong
- Vercel/Neon's own infrastructure alerts (unusual traffic, database load, failed deploys)
- Noticing credentials, API keys, or customer data exposed somewhere they shouldn't be (a leaked `.env`, a public GitHub commit, a pasted log)

Whoever notices something first should not wait for certainty — escalate on suspicion, not confirmation. It's much cheaper to stand down a false alarm than to lose the first hour of a real incident.

## 2. Containment

Immediate, reversible actions to stop the bleeding, roughly in likely order of use:

- Rotate the specific credential/secret involved (database password, `NEXTAUTH_SECRET`, a third-party API key) via the relevant provider's dashboard (Neon, Vercel env vars, ZeptoMail, etc.)
- Force-invalidate sessions for affected accounts by bumping `User.sessionVersion` (the same mechanism `suspendUserAction`/`suspendSellerAction` already use) — this signs a user out everywhere immediately, without needing a code deploy
- Suspend the specific account(s) involved if the incident is account-specific (compromised admin, compromised seller) rather than platform-wide
- If the issue is a live, actively-exploited code vulnerability, deploy a fix or a temporary mitigation (e.g., disabling a specific route) rather than waiting for a full root-cause before stopping active harm
- Do not delete logs, database rows, or any other evidence of what happened, even ones that look bad — see Section 4

## 3. Investigation

- Pull the relevant `AdminAuditLog` entries, Sentry error events, and Vercel/Neon access logs for the affected time window
- Establish: what data was actually accessed or exposed (not just what was theoretically reachable), which accounts/records are affected, how the exposure happened, and how long it was live before detection
- Identify whether any of the exposed data falls into "sensitive personal information" under the Data Privacy Act (government ID numbers, health information, etc.) — ATBP's seller ID-verification documents (`SellerProfile.idDocumentUrl`, `businessLicenseUrl`) are the most likely category of sensitive data this platform holds, given the ID-verification system already built
- Keep a running timeline as you go, in real time, not reconstructed afterward — this becomes the record referenced in Sections 4 and 6

## 4. Assessment

Determine the severity and who's actually affected:

- How many accounts/records, and which categories of data, are involved
- Whether the exposure was internal-only (e.g., visible to another admin who shouldn't have seen it) or genuinely external
- Whether the data was merely exposed (viewable) or actually exfiltrated (downloaded, copied, sent somewhere)
- Whether this is "likely to give rise to a real risk of serious harm" to the people affected — this is the actual legal threshold in the Privacy Policy's breach-notification commitment (Section 15), and is a determination to make with a privacy-competent reviewer, not unilaterally by engineering

## 5. Documentation

For every incident, regardless of severity, keep a written record of:

- What happened and when (the timeline from Section 3)
- What data/accounts were affected and how many
- What containment and remediation actions were taken and when
- Who was notified, when, and how (Section 6)
- Root cause and the fix applied

This record is what a future audit, an NPC inquiry, or a user's own question ("what happened to my data?") gets answered from — it needs to exist even for incidents that turn out not to require external notification.

## 6. Notification / Escalation (confirm process with a lawyer before relying on this in a real incident)

- Under NPC rules, a breach involving sensitive personal information, or information that could be used for identity fraud, that is likely to give rise to a real risk of serious harm, must be reported to the National Privacy Commission and to affected data subjects — the Privacy Policy commits to doing this "within the timeframe required by NPC regulations" rather than a specific number here, deliberately, since getting that number wrong publicly is worse than pointing to the regulation.
- Do not send an NPC or user notification without first confirming, with whoever is acting as ATBP's privacy contact (see `LEGAL_CONFIG.dpoNameOrContact`) or outside counsel, that the incident meets the actual legal threshold and that the notification's content is accurate — an inaccurate or premature breach notice can itself create liability and confusion.
- If law enforcement involvement seems warranted (theft of funds, a criminal intrusion), that's also a decision for whoever holds legal/business authority, not something to initiate unilaterally from engineering.

## 7. Remediation

- Ship the actual fix (patch the vulnerability, correct the access-control gap, rotate every credential that was exposed — not just the one you're sure was used)
- Confirm the fix by attempting to reproduce the original issue against the patched system
- Notify affected users of what's been fixed, once Section 6's process has run, so they know the specific risk is closed, not just "under investigation"

## 8. Post-Incident Review

- Once resolved, write a short retrospective: what happened, why it wasn't caught sooner, what specifically is changing (a new rate limit, an added audit log call, a permission check that was missing) so the same class of incident doesn't recur
- If the incident revealed a gap in this procedure itself, update this document
- Consider whether the incident should change any public-facing commitment (e.g., if a retention period or a third-party provider changes as a result, update the Privacy Policy)
