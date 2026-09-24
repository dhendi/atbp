"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCollectionNameSchema, userCollectionDescriptionSchema, firstIssue } from "@/lib/validation";

export interface CollectionItemRef {
  productId?: string;
  sellerId?: string;
  dropId?: string;
}

async function requireUser() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function createCollectionAction(input: { name: string; description?: string; isPublic?: boolean }) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };

  const nameResult = userCollectionNameSchema.safeParse(input.name);
  if (!nameResult.success) return { error: firstIssue(nameResult) };

  let description: string | null = null;
  if (input.description?.trim()) {
    const descriptionResult = userCollectionDescriptionSchema.safeParse(input.description);
    if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
    description = descriptionResult.data;
  }

  const collection = await prisma.userCollection.create({
    data: { userId, name: nameResult.data, description, isPublic: !!input.isPublic },
  });
  revalidatePath("/collections");
  return { success: true, id: collection.id };
}

export async function updateCollectionAction(id: string, input: { name?: string; description?: string; isPublic?: boolean }) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };
  const collection = await prisma.userCollection.findFirst({ where: { id, userId } });
  if (!collection) return { error: "Collection not found." };

  let name: string | undefined;
  if (input.name?.trim()) {
    const nameResult = userCollectionNameSchema.safeParse(input.name);
    if (!nameResult.success) return { error: firstIssue(nameResult) };
    name = nameResult.data;
  }

  let description: string | null | undefined;
  if (input.description !== undefined) {
    if (input.description.trim()) {
      const descriptionResult = userCollectionDescriptionSchema.safeParse(input.description);
      if (!descriptionResult.success) return { error: firstIssue(descriptionResult) };
      description = descriptionResult.data;
    } else {
      description = null;
    }
  }

  await prisma.userCollection.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(input.isPublic !== undefined ? { isPublic: input.isPublic } : {}),
    },
  });
  revalidatePath("/collections");
  revalidatePath(`/collections/${id}`);
  return { success: true };
}

export async function deleteCollectionAction(id: string) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };
  const result = await prisma.userCollection.deleteMany({ where: { id, userId } });
  if (result.count === 0) return { error: "Collection not found." };
  revalidatePath("/collections");
  return { success: true };
}

/** Returns the current user's collections with whether this exact item is already saved in each — powers the "Add to Collection" picker. */
export async function getMyCollectionsForItemAction(item: CollectionItemRef) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };

  const collections = await prisma.userCollection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { items: { where: item, select: { id: true } } },
  });
  return {
    success: true as const,
    collections: collections.map((c) => ({ id: c.id, name: c.name, isPublic: c.isPublic, hasItem: c.items.length > 0 })),
  };
}

export async function toggleCollectionItemAction(collectionId: string, item: CollectionItemRef, add: boolean) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };
  const collection = await prisma.userCollection.findFirst({ where: { id: collectionId, userId } });
  if (!collection) return { error: "Collection not found." };
  // Only these three ids are taken from the client object. Spreading `item`
  // itself let a caller include their own `collectionId`, which overrode the
  // ownership-checked one and wrote into (or deleted from) someone else's collection.
  const ref = { productId: item.productId, sellerId: item.sellerId, dropId: item.dropId };
  if (!ref.productId && !ref.sellerId && !ref.dropId) return { error: "Nothing to save." };

  if (add) {
    await prisma.userCollectionItem.upsert({
      where: item.productId
        ? { collectionId_productId: { collectionId, productId: item.productId } }
        : item.sellerId
          ? { collectionId_sellerId: { collectionId, sellerId: item.sellerId } }
          : { collectionId_dropId: { collectionId, dropId: item.dropId! } },
      create: { collectionId, ...ref },
      update: {},
    });
  } else {
    await prisma.userCollectionItem.deleteMany({ where: { collectionId, ...ref } });
  }
  revalidatePath(`/collections/${collectionId}`);
  return { success: true };
}

export async function removeCollectionItemAction(collectionId: string, itemId: string) {
  const userId = await requireUser();
  if (!userId) return { error: "Please log in first." };
  const collection = await prisma.userCollection.findFirst({ where: { id: collectionId, userId } });
  if (!collection) return { error: "Collection not found." };
  await prisma.userCollectionItem.deleteMany({ where: { id: itemId, collectionId } });
  revalidatePath(`/collections/${collectionId}`);
  return { success: true };
}
