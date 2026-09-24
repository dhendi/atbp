// Pure helper, safe for client and server. User-supplied URLs (social links,
// website links, ad destinations, image URLs) end up in href/src attributes,
// so anything that isn't a plain https URL (javascript:, data:, vbscript:,
// protocol-relative, or garbage) has to be rejected before it's stored AND
// before it's rendered.

/** Returns the normalized URL if `value` is a valid https URL, otherwise null. */
export function safeHttpsUrl(value: unknown, maxLength = 500): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";

/** True only for a Vercel Blob URL under the given path prefix (e.g.
 * "id-documents/"). Stored document URLs must pass this: they're later opened
 * by admins and passed to blob delete on resubmit, so an arbitrary URL there
 * would be an open link in the admin UI and a way to delete someone else's
 * blob (a public product photo, say) by pointing the field at it. */
export function isBlobUrlUnder(value: unknown, prefix: string): boolean {
  const safe = safeHttpsUrl(value, 1000);
  if (!safe) return false;
  const url = new URL(safe);
  return url.hostname.endsWith(BLOB_HOST_SUFFIX) && url.pathname.startsWith(`/${prefix}`);
}

export const ID_DOCUMENT_BLOB_PREFIX = "id-documents/";
