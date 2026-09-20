// Shared interest/tag taxonomy — the backbone of Explore, Gifts, and collection
// filtering. A product's `tags` field is a string[] drawn from these slugs
// (some assigned automatically from price/category at write time, most
// curated by the seller/seed data). Every discovery surface — Explore
// shortcuts, Featured Interests, Gifts occasion/recipient/budget browsing,
// onboarding preferences — reads from this one list rather than hardcoding
// labels per page.

export interface Interest {
  slug: string;
  label: string;
  emoji?: string;
}

export const INTERESTS: Interest[] = [
  // Budget (auto-assigned from price at write time)
  { slug: "under-250", label: "Under ₱250", emoji: "🪙" },
  { slug: "under-500", label: "Under ₱500", emoji: "💰" },
  { slug: "under-1000", label: "Under ₱1,000", emoji: "💸" },
  { slug: "under-2500", label: "Under ₱2,500", emoji: "🧾" },
  { slug: "worth-the-splurge", label: "Worth the Splurge", emoji: "💎" },

  // Broad interest shortcuts
  { slug: "gifts", label: "Gifts", emoji: "🎁" },
  { slug: "filipino-finds", label: "Filipino Finds", emoji: "🇵🇭" },
  { slug: "home", label: "Home", emoji: "🏠" },
  { slug: "handmade-finds", label: "Handmade Finds", emoji: "🎨" },
  { slug: "collectibles", label: "Collectibles", emoji: "🧸" },
  { slug: "fashion", label: "Fashion", emoji: "👕" },
  { slug: "automotive", label: "Automotive & Powersports", emoji: "🏍️" },
  { slug: "pre-loved", label: "Pre-Loved", emoji: "♻️" },
  { slug: "personalized", label: "Personalized", emoji: "✨" },
  { slug: "gaming", label: "Gaming", emoji: "🎮" },
  { slug: "books", label: "Books", emoji: "📚" },
  { slug: "jewelry", label: "Jewelry", emoji: "💎" },
  { slug: "toys-plush", label: "Toys & Plush", emoji: "🧸" },
  { slug: "trading-cards", label: "Trading Cards", emoji: "🎴" },

  // Gift recipients
  { slug: "gifts-for-him", label: "Gifts for Him", emoji: "🎁" },
  { slug: "gifts-for-her", label: "Gifts for Her", emoji: "🎁" },
  { slug: "gifts-for-kids", label: "Gifts for Kids", emoji: "🧒" },
  { slug: "gifts-for-parents", label: "Gifts for Parents", emoji: "👨‍👩‍👧" },
  { slug: "gifts-for-couples", label: "Gifts for Couples", emoji: "💑" },
  { slug: "gifts-for-friends", label: "Gifts for Friends", emoji: "🤝" },

  // Gift occasions
  { slug: "birthday-gifts", label: "Birthday Gifts", emoji: "🎂" },
  { slug: "wedding-gifts", label: "Wedding Gifts", emoji: "💍" },
  { slug: "anniversary-gifts", label: "Anniversary Gifts", emoji: "💐" },
  { slug: "graduation-gifts", label: "Graduation Gifts", emoji: "🎓" },
  { slug: "christmas-gifts", label: "Christmas Gifts", emoji: "🎄" },
  { slug: "valentines-gifts", label: "Valentine's Gifts", emoji: "❤️" },
  { slug: "housewarming-gifts", label: "Housewarming Gifts", emoji: "🏡" },
  { slug: "mothers-day-gifts", label: "Mother's Day Gifts", emoji: "🌷" },
  { slug: "fathers-day-gifts", label: "Father's Day Gifts", emoji: "👔" },
  { slug: "filipino-celebrations", label: "Filipino Celebrations", emoji: "🎉" },

  // "For ___" featured interests
  { slug: "for-collectors", label: "For Collectors", emoji: "🗂️" },
  { slug: "for-gamers", label: "For Gamers", emoji: "🎮" },
  { slug: "for-anime-fans", label: "For Anime Fans", emoji: "🌸" },
  { slug: "for-plant-lovers", label: "For Plant Lovers", emoji: "🪴" },
  { slug: "for-car-motorcycle-fans", label: "For Car & Motorcycle Fans", emoji: "🏍️" },
  { slug: "for-homebodies", label: "For Homebodies", emoji: "🛋️" },

  // Vibe / quality tags
  { slug: "vintage-finds", label: "Vintage Finds", emoji: "🕰️" },
  { slug: "hidden-gems", label: "Hidden Gems", emoji: "💎" },
  { slug: "cute-finds", label: "Cute Finds", emoji: "🥰" },

  // Niche fandoms
  { slug: "pokemon", label: "Pokémon", emoji: "🎴" },
  { slug: "anime", label: "Anime", emoji: "🌸" },
  { slug: "k-pop", label: "K-pop", emoji: "🎤" },
  { slug: "sanrio", label: "Sanrio & Kawaii", emoji: "🎀" },
  { slug: "sneakers", label: "Sneakers", emoji: "👟" },
  { slug: "streetwear", label: "Streetwear", emoji: "🧢" },

  // Discovery-search collections
  { slug: "tiktok-finds", label: "TikTok Finds", emoji: "🎵" },
  { slug: "rare-finds", label: "Rare & Hard-to-Find", emoji: "🔍" },
  { slug: "made-to-order", label: "Made-to-Order", emoji: "🎨" },
  { slug: "food-snacks", label: "Snacks & Pasalubong", emoji: "🍪" },
];

const INTEREST_BY_SLUG = new Map(INTERESTS.map((i) => [i.slug, i]));

export function getInterest(slug: string): Interest {
  return INTEREST_BY_SLUG.get(slug) ?? { slug, label: slug.replace(/-/g, " ") };
}

// ---------- Explore page: top interest shortcuts ----------
export const EXPLORE_SHORTCUTS = [
  "gifts", "under-500", "filipino-finds", "home", "handmade-finds", "collectibles",
  "fashion", "automotive", "pre-loved", "personalized", "gaming", "books",
  "jewelry", "toys-plush", "trading-cards",
];

// ---------- Explore page & homepage: Featured Interests collection cards ----------
// Fandom/hobby/vibe-driven, not price or gift-occasion buckets — those live on
// the dedicated Gifts page (GIFT_OCCASIONS/GIFT_RECIPIENTS/GIFT_BUDGETS below).
// Every slug here is backed by real tagged products, not a guessed category.
export const FEATURED_INTERESTS = [
  "pokemon", "anime", "for-gamers", "toys-plush", "trading-cards", "sneakers",
  "streetwear", "k-pop", "sanrio", "for-collectors", "vintage-finds",
  "for-plant-lovers", "for-car-motorcycle-fans", "jewelry", "books",
  "filipino-finds", "for-homebodies", "personalized", "handmade-finds", "hidden-gems",
];

// ---------- Gifts page ----------
export const GIFT_OCCASIONS = [
  "birthday-gifts", "wedding-gifts", "anniversary-gifts", "graduation-gifts",
  "christmas-gifts", "valentines-gifts", "housewarming-gifts", "mothers-day-gifts",
  "fathers-day-gifts", "filipino-celebrations",
];
export const GIFT_RECIPIENTS = [
  "gifts-for-him", "gifts-for-her", "gifts-for-kids", "gifts-for-parents",
  "gifts-for-couples", "gifts-for-friends",
];
export const GIFT_BUDGETS = ["under-250", "under-500", "under-1000", "under-2500", "worth-the-splurge"];

// ---------- Buyer onboarding preferences (Part 6) ----------
export const ONBOARDING_INTERESTS = [
  "handmade-finds", "vintage-finds", "pre-loved", "collectibles", "gaming",
  "pokemon", "anime", "toys-plush", "books", "for-plant-lovers", "automotive",
  "filipino-finds", "jewelry", "personalized", "fashion", "home", "gifts",
  "k-pop", "sanrio", "sneakers", "trading-cards",
];

// ---------- Discovery-driven search (Part 5) ----------
// Each entry links straight to a real, dynamically-filtered view — never a
// hardcoded product list. `href` composes existing filter params (interest,
// price, category, type) that /discover, /gifts, and /local already understand.
export interface DiscoveryCollection {
  slug: string;
  label: string;
  emoji: string;
  href: string;
}

export const DISCOVERY_SEARCH_COLLECTIONS: DiscoveryCollection[] = [
  { slug: "cute-under-500", label: "Cute Stuff Under ₱500", emoji: "🥰", href: "/discover?interest=cute-finds&price=0-500" },
  { slug: "collectors-corner", label: "Collector's Corner", emoji: "🗂️", href: "/discover?interest=for-collectors" },
  { slug: "tiktok-finds", label: "TikTok Finds", emoji: "🎵", href: "/discover?interest=tiktok-finds" },
  { slug: "trending", label: "Trending on ATBP", emoji: "🔥", href: "/trending" },
  { slug: "filipino-small-business", label: "Filipino Small Business Finds", emoji: "🇵🇭", href: "/discover?interest=filipino-finds" },
  { slug: "gifts-under-500", label: "Gifts Under ₱500", emoji: "🎁", href: "/gifts?budget=under-500" },
  { slug: "gifts-under-1000", label: "Gifts Under ₱1,000", emoji: "🎁", href: "/gifts?budget=under-1000" },
  { slug: "hidden-gems", label: "Hidden Gems", emoji: "💎", href: "/discover?interest=hidden-gems" },
  { slug: "rare-finds", label: "Rare & Hard-to-Find", emoji: "🔍", href: "/discover?interest=rare-finds" },
  { slug: "new-and-interesting", label: "New & Interesting", emoji: "✨", href: "/discover?sort=newest" },
  { slug: "made-to-order", label: "Made-to-Order", emoji: "🎨", href: "/made-to-order" },
  { slug: "custom-gifts", label: "Custom Gifts", emoji: "🎀", href: "/discover?interest=personalized" },
  { slug: "hobby-finds", label: "Hobby Finds", emoji: "🧩", href: "/discover?category=hobby-toys" },
  { slug: "anime-collectibles", label: "Anime & Collectibles", emoji: "🌸", href: "/discover?interest=anime" },
  { slug: "cute-kawaii", label: "Cute & Kawaii", emoji: "🎀", href: "/discover?interest=cute-finds" },
  { slug: "pre-loved-finds", label: "Pre-Loved Finds", emoji: "♻️", href: "/discover?type=PRE_LOVED" },
  { slug: "local-finds", label: "Local Finds", emoji: "📍", href: "/local" },
  { slug: "food-finds", label: "Pasalubong Finds", emoji: "🍪", href: "/discover?category=food-and-snacks" },
];

const NON_IDENTITY_SLUGS = new Set<string>([...GIFT_BUDGETS, ...GIFT_OCCASIONS, ...GIFT_RECIPIENTS, "gifts"]);

/** Picks the most common real "why you'd care" tags across a sample of a seller's
 * products — fandom/hobby/category flavor, not budget or gift-occasion tags — for
 * a compact "Pokémon · Trading Cards" identity line on seller cards. */
export function topIdentityInterests(products: { tags: unknown }[], limit = 3): string[] {
  const counts = new Map<string, number>();
  for (const p of products) {
    for (const tag of (p.tags as string[] | undefined) ?? []) {
      if (NON_IDENTITY_SLUGS.has(tag)) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([slug]) => slug);
}

/** Auto-derived budget tag from a price, so sellers never have to tag it themselves. */
export function budgetTagsForPrice(price: number): string[] {
  const tags: string[] = [];
  if (price <= 250) tags.push("under-250");
  if (price <= 500) tags.push("under-500");
  if (price <= 1000) tags.push("under-1000");
  if (price <= 2500) tags.push("under-2500");
  if (price > 2500) tags.push("worth-the-splurge");
  return tags;
}

/** Auto-derived tags from a product's type/category, layered under a seller's own curated tags. */
export function autoTagsForProduct(opts: { type: string; categorySlug: string; price: number }): string[] {
  const tags = new Set(budgetTagsForPrice(opts.price));
  if (opts.type === "HANDMADE") tags.add("handmade-finds");
  if (opts.type === "VINTAGE") tags.add("vintage-finds");
  if (opts.type === "PRE_LOVED") tags.add("pre-loved");
  if (opts.type === "COLLECTIBLE") tags.add("for-collectors").add("collectibles");
  if (opts.categorySlug === "filipino-finds" || opts.categorySlug === "local-brands") tags.add("filipino-finds");
  if (opts.categorySlug === "home-living") tags.add("home").add("for-homebodies");
  if (opts.categorySlug === "fashion") tags.add("fashion");
  if (opts.categorySlug === "jewelry") tags.add("jewelry");
  return [...tags];
}
