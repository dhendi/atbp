// Toggle whole product features on/off without deleting the underlying code —
// flip back to `true` when ready and nothing else needs to change.

// Auctions need a critical mass of bidders to feel alive; launching them
// before ATBP has a steady, well-established buyer base risks a feature that
// looks half-dead with too few bids. Holding off until then — rough target:
// a consistent ~100k active buyers — then flip this on.
export const AUCTIONS_ENABLED = false;

// Livestreams need a critical mass of concurrent viewers for the same
// reason — a "live" stream with nobody watching undercuts the feature more
// than not having it at all. Hold off until there's real, steady traffic.
export const LIVESTREAMS_ENABLED = false;

// ---------- Launch category scope ----------
// ATBP's beta launch positioning is Handmade, Pre-loved, Vintage, and
// Collectibles specifically — see the homepage hero copy. Digital Products
// and Snacks & Pasalubong (formerly "Food & Snacks") are real, coded features
// (their listing forms, checkout paths, and Studio tooling all work), but
// promoting a category before the marketplace has real supply/demand in it
// risks a new visitor thinking ATBP is a general everything-marketplace on
// day one. Flip these on later without touching anything else — the
// underlying pages, actions, and data model don't change. Snacks &
// Pasalubong is open at launch (real seller demand expected); Digital
// Products stays off until there's real supply.
//
// Services no longer has its own browse page or Category group (its one
// surviving category, Illustration & Art Commissions, merged into Handmade &
// Art's "Digital Art" — see prisma/seed.ts) — SERVICES_ENABLED now only
// gates the "Offer a Service" card on /sell; sellers can still list and sell
// services, there's just no dedicated /services destination for buyers.
export const SERVICES_ENABLED = true;
export const DIGITAL_PRODUCTS_ENABLED = false;
export const FOOD_ENABLED = true;

// Markets (the timed pop-up-event selling mode, distinct from the Category
// system above) is off at launch — not enough concurrent sellers yet for a
// "market" to feel like one. The route and Studio tooling stay intact;
// flip this back on when there's a real cohort to launch it with.
export const MARKETS_ENABLED = false;

// The top-level Category rows (see prisma/seed.ts) that map to a disabled
// vertical above — used to filter category-browsing UI (Discover's "Shop by
// Category" grid, the Sell page) without deleting the Category rows
// themselves or touching how categoryId filtering works everywhere else.
export const LAUNCH_HIDDEN_CATEGORY_SLUGS = new Set([
  ...(DIGITAL_PRODUCTS_ENABLED ? [] : ["digital-products"]),
  ...(FOOD_ENABLED ? [] : ["food-and-snacks"]),
]);
