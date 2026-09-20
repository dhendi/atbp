import { createHmac, randomBytes } from "crypto";

/**
 * RFC 6238 TOTP on top of RFC 4226 HOTP — 30-second step, 6 digits, SHA-1.
 * SHA-1 isn't used for anything cryptographically sensitive here (it's the
 * universal default every authenticator app — Google Authenticator, Authy,
 * 1Password, etc. — expects); the actual secret stays private and random.
 *
 * No QR code: the secret is shown as plain text for manual entry, which every
 * authenticator app supports as a "can't scan" fallback. That keeps this
 * feature dependency-free — add a `qrcode` package later if scanning matters
 * more than one extra typed string during setup.
 */
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of str.toUpperCase().replace(/[^A-Z2-7]/g, "")) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function hotp(secret: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function generateTotp(base32Secret: string, atTimeMs = Date.now()): string {
  const counter = Math.floor(atTimeMs / 1000 / STEP_SECONDS);
  return hotp(base32Decode(base32Secret), counter);
}

/** Allows the previous/next 30s step too, so a code entered right at a
 * boundary (or a slightly-off device clock) still verifies. */
export function verifyTotp(base32Secret: string, token: string, windowSteps = 1): boolean {
  const cleaned = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const now = Date.now();
  for (let step = -windowSteps; step <= windowSteps; step++) {
    if (generateTotp(base32Secret, now + step * STEP_SECONDS * 1000) === cleaned) return true;
  }
  return false;
}

export function otpauthUri(secret: string, accountLabel: string): string {
  return `otpauth://totp/ATBP:${encodeURIComponent(accountLabel)}?secret=${secret}&issuer=ATBP&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => randomBytes(5).toString("hex"));
}
