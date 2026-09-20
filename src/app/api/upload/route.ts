import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { auth } from "@/lib/auth";

// Client-side upload to Vercel Blob: the browser PUTs the file bytes directly to
// blob storage using a short-lived token this route issues, rather than routing
// the file through this serverless function — required for video, which can
// easily exceed the request body size a Route Handler can accept.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// Digital Product deliverables (see Product.digitalFileUrls) — intentionally
// broad since the catalog spans STL files, ebooks, fonts, presets, templates,
// audio, video, and archives. No executable/script types, on principle.
const ALLOWED_DIGITAL_FILE_TYPES = [
  "application/pdf", "application/zip", "application/x-zip-compressed", "application/vnd.rar",
  "application/epub+zip", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/octet-stream", // .stl and other generic-binary formats the browser can't otherwise name
  "font/ttf", "font/otf", "application/font-sfnt",
  "image/svg+xml", "image/jpeg", "image/png", "image/webp", "image/gif",
  "audio/mpeg", "audio/wav", "audio/x-wav",
  "video/mp4", "video/webm", "video/quicktime",
];
// Seller ID / business license documents — images or a scanned PDF only. No
// public page ever links these URLs (they're admin-review-only, stored on
// SellerProfile.idDocumentUrl / businessLicenseUrl) — see the "private by
// convention, not by ACL" note in becomeSellerAction and friends.
const ALLOWED_ID_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Please log in first." }, { status: 401 });

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const kind =
          clientPayload === "video" ? "video" :
          clientPayload === "digital-file" ? "digital-file" :
          clientPayload === "id-document" ? "id-document" : "image";
        const byKind = {
          video: { types: ALLOWED_VIDEO_TYPES, maxBytes: 50 * 1024 * 1024 },
          "digital-file": { types: ALLOWED_DIGITAL_FILE_TYPES, maxBytes: 200 * 1024 * 1024 },
          "id-document": { types: ALLOWED_ID_DOCUMENT_TYPES, maxBytes: 10 * 1024 * 1024 },
          image: { types: ALLOWED_IMAGE_TYPES, maxBytes: 5 * 1024 * 1024 },
        } as const;
        return {
          allowedContentTypes: byKind[kind].types,
          maximumSizeInBytes: byKind[kind].maxBytes,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload failed:", error);
    // Vercel Blob's own validation errors (bad type, too large) are short,
    // client-safe messages — pass those through. Anything longer than that is
    // more likely an internal/network error, so fall back to a generic message
    // rather than risk echoing something we didn't intend to expose.
    const message = error instanceof Error ? error.message : "";
    const safeMessage = message && message.length < 150 && !/https?:\/\//.test(message) ? message : "Upload failed. Please try again.";
    return NextResponse.json({ error: safeMessage }, { status: 400 });
  }
}
