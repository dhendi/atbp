import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** The only sanctioned way anyone ever reaches a Digital Product's actual
 * file — the buyer only ever sees this route (see
 * getDigitalDownloadLinksAction), never Product.digitalFileUrls directly.
 * The token itself (32-byte random, expiring, limited-use) is treated as
 * sufficient proof of authorization, same "magic link" convention already
 * used for guest order tracking / password reset in this app — no separate
 * login check on top of it. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const fileIndexParam = new URL(req.url).searchParams.get("file");
  const fileIndex = fileIndexParam ? parseInt(fileIndexParam, 10) : 0;

  const downloadToken = await prisma.digitalDownloadToken.findUnique({
    where: { token },
    include: { orderItem: { include: { product: true } } },
  });
  if (!downloadToken) return NextResponse.json({ error: "This download link is invalid." }, { status: 404 });
  if (downloadToken.revoked) return NextResponse.json({ error: "This download link has been revoked. Contact support if you believe this is a mistake." }, { status: 403 });
  if (downloadToken.expiresAt < new Date()) return NextResponse.json({ error: "This download link has expired." }, { status: 410 });
  if (downloadToken.downloadCount >= downloadToken.maxDownloads) {
    return NextResponse.json({ error: "This download link has reached its download limit." }, { status: 429 });
  }

  const fileUrls = (downloadToken.orderItem.product.digitalFileUrls as string[] | null) ?? [];
  const fileUrl = fileUrls[fileIndex];
  if (!fileUrl) return NextResponse.json({ error: "File not found." }, { status: 404 });

  await prisma.digitalDownloadToken.update({ where: { id: downloadToken.id }, data: { downloadCount: { increment: 1 } } });
  return NextResponse.redirect(fileUrl);
}
