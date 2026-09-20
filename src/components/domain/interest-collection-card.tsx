import { getInterest } from "@/lib/interests";
import { CollectionCard } from "@/components/domain/collection-card";

/** A "Featured Interests" tile — thin wrapper over CollectionCard that resolves
 * an interest slug to its label/emoji and links into filtered Explore results. */
export function InterestCollectionCard({ slug, image, count }: { slug: string; image?: string; count?: number }) {
  const interest = getInterest(slug);
  return (
    <CollectionCard
      href={`/discover?interest=${slug}`}
      title={interest.label}
      emoji={interest.emoji}
      image={image}
      subtitle={typeof count === "number" && count > 0 ? `${count}+ finds` : undefined}
    />
  );
}
