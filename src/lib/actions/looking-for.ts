"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";

export async function createLookingForPostAction(input: {
  title: string;
  description: string;
  categoryId?: string;
  area?: string;
  budgetMin?: number;
  budgetMax?: number;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!input.title.trim() || !input.description.trim()) return { error: "Add a title and description." };

  const post = await prisma.lookingForPost.create({
    data: {
      userId: session.user.id,
      title: input.title.trim(),
      description: input.description.trim(),
      categoryId: input.categoryId || null,
      area: input.area || null,
      budgetMin: input.budgetMin ?? null,
      budgetMax: input.budgetMax ?? null,
    },
  });
  revalidatePath("/local/looking-for");
  return { success: true, postId: post.id };
}

export async function closeLookingForPostAction(postId: string, status: "FULFILLED" | "CLOSED") {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const post = await prisma.lookingForPost.findUnique({ where: { id: postId } });
  if (!post || post.userId !== session.user.id) return { error: "Not authorized." };

  await prisma.lookingForPost.update({ where: { id: postId }, data: { status } });
  revalidatePath("/local/looking-for");
  revalidatePath(`/local/looking-for/${postId}`);
  return { success: true };
}

export async function replyToLookingForAction(postId: string, message: string, productId?: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  if (!message.trim()) return { error: "Write a reply first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Only sellers can reply to requests." };

  const post = await prisma.lookingForPost.findUnique({ where: { id: postId } });
  if (!post) return { error: "This request no longer exists." };
  if (post.status !== "OPEN") return { error: "This request is no longer open." };

  if (productId) {
    const product = await prisma.product.findFirst({ where: { id: productId, sellerId: seller.id } });
    if (!product) return { error: "Product not found." };
  }

  await prisma.lookingForReply.create({
    data: { postId, sellerId: seller.id, message: message.trim(), productId: productId || null },
  });

  await notify(post.userId, "NEW_MESSAGE", "Someone replied to your request", `${seller.shopName} replied to "${post.title}"`, `/local/looking-for/${postId}`);

  revalidatePath(`/local/looking-for/${postId}`);
  return { success: true };
}
