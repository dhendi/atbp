import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MapPin, HandHeart } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPeso, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { ReplyForm } from "./reply-form";
import { PostOwnerActions } from "./post-owner-actions";
import { MessageSellerButton } from "./message-seller-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.lookingForPost.findUnique({ where: { id }, select: { title: true, description: true } });
  if (!post) return { title: "Request not found" };

  const title = post.title;
  const description = post.description.slice(0, 160);

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function LookingForDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const post = await prisma.lookingForPost.findUnique({
    where: { id },
    include: {
      user: true,
      category: true,
      replies: { include: { seller: true, product: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!post) notFound();

  const isOwner = session?.user?.id === post.userId;
  const seller = session?.user ? await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } }) : null;
  const sellerProducts = seller ? await prisma.product.findMany({ where: { sellerId: seller.id, status: "ACTIVE" }, select: { id: true, title: true }, take: 50 }) : [];
  const alreadyReplied = seller ? post.replies.some((r) => r.sellerId === seller.id) : false;

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4 pb-10 md:px-6">
      <div className="rounded-card border border-ink-100 bg-white p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold text-ink-900">{post.title}</h1>
            <p className="text-xs text-ink-500">{post.user.name} · {timeAgo(post.createdAt)}</p>
          </div>
          <Badge variant={post.status === "OPEN" ? "success" : "subtle"}>{post.status}</Badge>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm text-ink-700">{post.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          {post.area && <span className="flex items-center gap-1"><MapPin size={11} /> {post.area}</span>}
          {post.category && <span>{post.category.name}</span>}
          {(post.budgetMin || post.budgetMax) && (
            <span>
              Budget: {post.budgetMin ? formatPeso(post.budgetMin) : "₱0"}
              {post.budgetMax ? ` - ${formatPeso(post.budgetMax)}` : "+"}
            </span>
          )}
        </div>
        {isOwner && post.status === "OPEN" && (
          <div className="mt-3 border-t border-ink-100 pt-3">
            <PostOwnerActions postId={post.id} />
          </div>
        )}
      </div>

      {seller && post.status === "OPEN" && !isOwner && !alreadyReplied && (
        <ReplyForm postId={post.id} products={sellerProducts} />
      )}
      {seller && alreadyReplied && (
        <p className="text-center text-xs text-ink-400">You&apos;ve already replied to this request.</p>
      )}

      <div>
        <h2 className="mb-3 font-bold text-ink-900">Replies ({post.replies.length})</h2>
        {post.replies.length === 0 ? (
          <EmptyState icon={HandHeart} title="No replies yet" description="Check back soon, or share this request with a seller you know." />
        ) : (
          <div className="space-y-3">
            {post.replies.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink-200 p-3">
                <div className="flex items-center justify-between">
                  <Link href={`/seller/${r.seller.handle}`} className="font-bold text-ink-900 hover:underline">
                    {r.seller.shopName}
                  </Link>
                  <span className="text-xs text-ink-400">{timeAgo(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-ink-700">{r.message}</p>
                {r.product && (
                  <Link href={`/product/${r.product.id}`} className="mt-2 flex items-center gap-2 rounded-xl border border-ink-100 p-2 hover:bg-ink-50">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                      <Image src={(r.product.images as string[])[0]} alt={r.product.title} fill className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink-800">{r.product.title}</p>
                      <p className="text-xs text-ink-500">{formatPeso(r.product.price)}</p>
                    </div>
                  </Link>
                )}
                {isOwner && (
                  <div className="mt-2">
                    <MessageSellerButton sellerId={r.sellerId} postTitle={post.title} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
