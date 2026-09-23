import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NEW_CATEGORIES, NEW_SELLERS } from "./seed-data/new-sellers";
import { recordCommission } from "../src/lib/services/commission";
import { maybeGrantFoundingSeller, FOUNDING_SELLER_CAMPAIGN_ID, FOUNDING_SELLER_LIMIT } from "../src/lib/services/founding-seller";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "demo1234";

function pesoRandom(min: number, max: number, step = 50) {
  const steps = Math.floor((max - min) / step);
  return min + Math.floor(Math.random() * steps) * step;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Real, content-matched photos (Unsplash) keyed by Unsplash photo id.
function u(id: string, w = 900, h = 900) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}

const PHOTOS = {
  embroidery: ["1622378158084-f2221260e688", "1605743970487-c2c58adbdfba", "1568288796918-03e7d93306bd", "1592169138776-7c9211066fc8", "1651177571506-6d38447d987b", "1599589915468-b4c71ed62543"],
  vintageCamera: ["1510127034890-ba27508e9f1c", "1516961642265-531546e84af2", "1603208234872-619ffa1209cb"],
  antiqueRadio: ["1639148604826-8c8afc2aefe5", "1684556707134-2981ee31de27", "1588523900549-d60e602ced7c"],
  barong: ["1691053318576-4bf08315e877", "1690967132641-7659ae914144", "1585567656435-edb88a467535"],
  loafers: ["1616406432452-07bc5938759d", "1662541089338-c7d53b88be70"],
  trenchCoat: ["1539533113208-f6df8cc8b543", "1539533018447-63fcce2678e3"],
  denimJacket: ["1611312449408-fcece27cdbb7", "1555583743-991174c11425"],
  capizLamp: ["1599241536858-cc5b5788b6f3"],
  enamelCanisters: ["1770924673879-781860ce03f1", "1586664630347-418bce93721a"],
  diecast: ["1696824711688-171f379badcc", "1696824711595-50ef337d593d"],
  carvedFigure: ["1618523748986-e95e741e6537", "1786684937744-cae47a930366"],
  comicBooks: ["1601645191163-3fc0d5d64e35", "1612036782180-6f0b6cd846fe"],
  tradingCards: ["1613771404784-3a5686aa2be3", "1628968434441-d9c1c66dcde7"],
  seascapePainting: ["1690850855189-28de3097586a", "1784296868264-23398694802c"],
  jeepney: ["1750015818641-566e07d3681b", "1708517570236-22166dd9cdd2"],
  inkPortrait: ["1593472807861-5bb884af28f6", "1674643925879-d457c6e93801"],
  miniCanvas: ["1568448705245-1250489bcd66", "1691849721970-e2e3ba443ed7"],
  resinKeychain: ["1687363714985-990685339050", "1618212542687-93ac846f43c3"],
  resinOrnament: ["1788051115771-0d8d840476ff", "1766157433529-9ce21b6c1e09"],
  cakeTopper: ["1604531825889-88dc0c7e37db", "1558999959895-895934733d6f"],
  ceramicMug: ["1666445844615-0a3930270f13", "1590422749897-47036da0b0ff"],
  ceramicBowls: ["1577576223085-3eb295cd414f", "1530006498959-b7884e829a04"],
  ceramicVase: ["1631125915902-d8abe9225ff2", "1631125915732-b98f8774f675"],
  rattanTray: ["1754573433915-2a68e3b339b0", "1747889682883-5b41a4b915ae"],
  windChime: ["1770725393454-1e4f01593e28", "1770550459572-e067c61acca1"],
  coconutCandle: ["1592907677605-d42ffee99d05", "1756447647171-0022624cf35f"],
  tableRunner: ["1775806099746-1b0252615522", "1758810743287-e3a0ab989714"],
  vintageChair: ["1650476524564-f94dc9669067", "1730373451883-45a448eb9bfc"],
  barCart: ["1605086554054-24d7b61d8102", "1638741279987-edcad3da1c67"],
  sewingMachine: ["1466027397211-20d0f2449a3f", "1626274890657-e28d5b65b04b"],
  toteBag: ["1598532163257-ae3c6b2524b6", "1588122698107-836d3c39704c"],
  placemats: ["1788529933261-06dda639e214", "1693740784717-67fcaad5526a"],
  wallHanging: ["1567696154083-9547fd0c8e1d", "1776721977064-d4e5389db6b9"],
  silverCuff: ["1728646998199-127b357a464d", "1728646996588-9ae7ef3c9633"],
  pendant: ["1589128777073-263566ae5e4d", "1588444837495-c6cfeb53f32d"],
  engravedRing: ["1638382874361-5d1438548f10", "1593295583578-fda964d48b72"],
  craftWorkshop: ["1506806732259-39c2d0268443", "1522065893269-6fd20f6d7438", "1528717384022-f8d665c86909", "1582571881821-380713f48b29", "1511306162219-1c5a469ab86c", "1568259701122-d82953b2b538", "1698256179114-30758b66f70d", "1534953342533-7711c98712be"],
  craftMarket: ["1782764907511-0465a73aa839", "1771502598788-ff689c384e21", "1769425158985-8452c0e54194", "1777892505726-94e28266477a", "1771502658483-cc4875d0c863"],
  potteryStudio: ["1595351298020-038700609878", "1739467516257-20c1d7f1949a"],
} as const;

function photos(ids: readonly string[], w = 900, h = 900) {
  return ids.map((id) => u(id, w, h));
}

function avatar(seed: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

function birNumber() {
  const part = () => Math.floor(100 + Math.random() * 900);
  return `${part()}-${part()}-${part()}-000`;
}

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

// Mirrors src/lib/interests.ts's budgetTagsForPrice/autoTagsForProduct — kept as
// a small local copy since seed.ts runs under tsx outside the Next.js path-alias
// resolution used by the app itself.
function autoTags(opts: { type: string; categorySlug: string; price: number }): string[] {
  const tags = new Set<string>();
  if (opts.price <= 250) tags.add("under-250");
  if (opts.price <= 500) tags.add("under-500");
  if (opts.price <= 1000) tags.add("under-1000");
  if (opts.price <= 2500) tags.add("under-2500");
  if (opts.price > 2500) tags.add("worth-the-splurge");
  if (opts.type === "HANDMADE") tags.add("handmade-finds");
  if (opts.type === "VINTAGE") tags.add("vintage-finds");
  if (opts.type === "PRE_LOVED") tags.add("pre-loved");
  if (opts.type === "COLLECTIBLE") { tags.add("for-collectors"); tags.add("collectibles"); }
  if (opts.categorySlug === "filipino-finds" || opts.categorySlug === "local-brands") tags.add("filipino-finds");
  if (opts.categorySlug === "home-living") { tags.add("home"); tags.add("for-homebodies"); }
  if (opts.categorySlug === "fashion") tags.add("fashion");
  if (opts.categorySlug === "jewelry") tags.add("jewelry");
  if (opts.categorySlug === "gaming") tags.add("for-gamers");
  if (opts.categorySlug === "trading-cards") tags.add("trading-cards");
  if (opts.categorySlug === "anime") { tags.add("anime"); tags.add("for-anime-fans"); }
  if (opts.categorySlug === "books") tags.add("books");
  if (opts.categorySlug === "automotive") { tags.add("automotive"); tags.add("for-car-motorcycle-fans"); }
  return [...tags];
}

function reputationForTier(tier: string) {
  switch (tier) {
    case "TOP":
      return { rating: 4.85 + Math.random() * 0.15, ratingCount: 300 + Math.floor(Math.random() * 600), totalSales: 600 + Math.floor(Math.random() * 1900) };
    case "ESTABLISHED":
      return { rating: 4.75 + Math.random() * 0.17, ratingCount: 100 + Math.floor(Math.random() * 300), totalSales: 150 + Math.floor(Math.random() * 450) };
    case "TRUSTED":
      return { rating: 4.5 + Math.random() * 0.35, ratingCount: 20 + Math.floor(Math.random() * 130), totalSales: 25 + Math.floor(Math.random() * 125) };
    default:
      return {
        rating: Math.random() < 0.4 ? 0 : Math.round((3.6 + Math.random() * 1.2) * 10) / 10,
        ratingCount: Math.random() < 0.4 ? 0 : Math.floor(Math.random() * 15),
        totalSales: Math.floor(Math.random() * 20),
      };
  }
}

function badgesForTier(tier: string, physicalPresence: string, pickupAvailable: boolean): string[] {
  const badges: string[] = [];
  if (tier === "TOP") {
    badges.push("SALES_1000");
    if (Math.random() < 0.7) badges.push("HIGHLY_RATED");
    if (Math.random() < 0.5) badges.push("FAST_SHIPPER");
  } else if (tier === "ESTABLISHED") {
    badges.push("SALES_100");
    if (Math.random() < 0.5) badges.push("HIGHLY_RATED");
    if (Math.random() < 0.3) badges.push("FAST_SHIPPER");
  } else if (tier === "TRUSTED") {
    if (Math.random() < 0.4) badges.push("FAST_SHIPPER");
  } else if (Math.random() < 0.3) {
    badges.push("RISING_SELLER");
  }
  if (physicalPresence === "PHYSICAL_STORE") badges.push("PHYSICAL_STORE");
  if (pickupAvailable) badges.push("LOCAL_SELLER");
  return badges;
}

// This script wipes every table before reseeding — the compute endpoint id
// below is production's, unique to that Neon branch. Any other branch (e.g.
// a local "dev" branch) has a different endpoint id and seeds freely; this
// only blocks the one connection string that would actually destroy real data.
const PRODUCTION_DB_ENDPOINT_ID = "ep-spring-wildflower-auso1gvs";

function assertNotProduction() {
  const url = process.env.DATABASE_URL ?? "";
  if (url.includes(PRODUCTION_DB_ENDPOINT_ID) && process.env.ALLOW_PROD_SEED !== "true") {
    console.error(
      "\nRefusing to seed: DATABASE_URL points at the production database.\n" +
      "This script deletes every row in every table. If you really mean to reset production, re-run with:\n" +
      "  ALLOW_PROD_SEED=true npm run db:seed\n"
    );
    process.exit(1);
  }
}

async function main() {
  assertNotProduction();
  console.log("Seeding ATBP demo data...");

  // ---------- Clean slate ----------
  await prisma.$transaction([
    prisma.eventInterest.deleteMany(),
    prisma.eventPromotion.deleteMany(),
    prisma.eventSeller.deleteMany(),
    prisma.event.deleteMany(),
    prisma.collectionProduct.deleteMany(),
    prisma.collectionSeller.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.lookingForReply.deleteMany(),
    prisma.lookingForPost.deleteMany(),
    prisma.adPlacement.deleteMany(),
    prisma.advertisement.deleteMany(),
    prisma.adCampaign.deleteMany(),
    prisma.advertiser.deleteMany(),
    prisma.promotionalCredit.deleteMany(),
    prisma.promotion.deleteMany(),
    prisma.commission.deleteMany(),
    prisma.sellerPlanOverride.deleteMany(),
    prisma.sellerSubscription.deleteMany(),
    prisma.promoRedemption.deleteMany(),
    prisma.promoCode.deleteMany(),
    prisma.couponRedemption.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.couponCampaign.deleteMany(),
    prisma.promotionCounter.deleteMany(),
    prisma.message.deleteMany(),
    prisma.messageThread.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.report.deleteMany(),
    prisma.review.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.savedProduct.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.payout.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.auctionBid.deleteMany(),
    prisma.auction.deleteMany(),
    prisma.claimSlot.deleteMany(),
    prisma.livestreamProduct.deleteMany(),
    prisma.streamReminder.deleteMany(),
    prisma.livestream.deleteMany(),
    prisma.dropProduct.deleteMany(),
    prisma.drop.deleteMany(),
    prisma.market.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.sellerProfile.deleteMany(),
    prisma.address.deleteMany(),
    prisma.adminAuditLog.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.twoFactorAuth.deleteMany(),
    prisma.rateLimitEvent.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- Categories ----------
  const categoryDefs = [
    { name: "Handmade", slug: "handmade", icon: "✂️" },
    { name: "Pre-Loved", slug: "pre-loved", icon: "♻️" },
    { name: "Vintage", slug: "vintage", icon: "🕐" },
    { name: "Collectibles", slug: "collectibles", icon: "🧸" },
    { name: "Art", slug: "art", icon: "🎨" },
    { name: "Custom", slug: "custom", icon: "✨" },
    // Named distinctly from their own parent group below (Filipino Finds,
    // Fashion & Accessories, Home & Living) — a leaf sharing its parent's
    // exact name read as a duplicate entry in the categories menu.
    { name: "Filipino Crafts", slug: "filipino-finds", icon: "🧺" },
    { name: "Local Brands", slug: "local-brands", icon: "🏷️" },
    { name: "Antiques", slug: "antiques", icon: "🏺" },
    { name: "Hobby & Toys", slug: "hobby-toys", icon: "🎲" },
    { name: "Clothing & Apparel", slug: "fashion", icon: "👗" },
    { name: "Home Décor", slug: "home-living", icon: "🏠" },
    ...NEW_CATEGORIES,
    // Food & Snacks subcategories — shelf-stable packaged goods only, never
    // fresh/hot food delivery (see Product.isFood + food attribute fields).
    { name: "Cookies", slug: "cookies", icon: "🍪" },
    { name: "Candies", slug: "candies", icon: "🍬" },
    { name: "Chocolates", slug: "chocolates", icon: "🍫" },
    { name: "Chips", slug: "chips", icon: "🥔" },
    { name: "Nuts", slug: "nuts", icon: "🥜" },
    { name: "Dried Snacks", slug: "dried-snacks", icon: "🍑" },
    { name: "Coffee & Tea", slug: "coffee-tea", icon: "☕" },
    { name: "Sauces & Condiments", slug: "sauces-condiments", icon: "🌶️" },
    { name: "Spreads", slug: "spreads", icon: "🍯" },
    { name: "Snack Boxes", slug: "snack-boxes", icon: "📦" },
    { name: "Gift Boxes", slug: "food-gift-boxes", icon: "🎁" },
    // ---------- ATBP Services: Services (kind="SERVICE") ----------
    // Trimmed down to just art commissions per product decision — the
    // original 31-category list (graphic design, web dev, tutoring, etc.)
    // was too granular for how few Service sellers ATBP actually has.
    { name: "Illustration & Art Commissions", slug: "illustration-art-commissions", icon: "🎨" },
    // ---------- ATBP Services: Digital Products (kind="DIGITAL_PRODUCT") ----------
    { name: "3D Print Designs & STL Files", slug: "stl-3d-print-designs", icon: "🧊" },
    { name: "Canva/PowerPoint/Sheets Templates", slug: "canva-ppt-templates", icon: "📊" },
    { name: "Lightroom Presets & Photoshop Actions", slug: "lightroom-presets-ps-actions", icon: "🎞️" },
    { name: "Ebooks & Guides", slug: "ebooks-guides", icon: "📘" },
    { name: "Printables & Digital Planners", slug: "printables-planners", icon: "🗒️" },
    { name: "Fonts", slug: "fonts", icon: "🔤" },
    { name: "Digital Art, Wallpapers & Stickers", slug: "digital-art-wallpapers-stickers", icon: "🖼️" },
    { name: "Notion Templates", slug: "notion-templates", icon: "🗂️" },
    { name: "Website & Shopify Themes", slug: "website-shopify-themes", icon: "🛍️" },
    { name: "UI Kits & Figma Files", slug: "ui-kits-figma-files", icon: "🎛️" },
    { name: "Mockups & Icon Packs", slug: "mockups-icon-packs", icon: "🖱️" },
    { name: "Game Assets", slug: "game-assets", icon: "🎮" },
    { name: "Music, Beats & Sound Effects", slug: "music-beats-sfx", icon: "🎧" },
    { name: "Stock Photos & Video", slug: "stock-photos-video", icon: "📷" },
    { name: "Video Templates", slug: "video-templates", icon: "🎬" },
    { name: "Craft & Cut Files", slug: "craft-cut-files", icon: "✂️" },
  ];
  const categories = await Promise.all(
    categoryDefs.map((c, i) => prisma.category.create({ data: { ...c, order: i } }))
  );
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));

  // ---------- Category hierarchy ----------
  // The 30 leaf categories above are still what products are tagged with —
  // grouping them under a small set of top-level parents just keeps "Browse
  // Categories" from being an overwhelming wall of chips. Products keep their
  // existing (leaf) categoryId; only parentId is set here.
  const CATEGORY_GROUPS: { name: string; slug: string; icon: string; children: string[] }[] = [
    { name: "Handmade & Art", slug: "handmade-art", icon: "🎨", children: ["handmade", "art", "custom"] },
    { name: "Vintage & Pre-Loved", slug: "vintage-preloved", icon: "🕰️", children: ["pre-loved", "vintage", "antiques"] },
    { name: "Collectibles & Hobbies", slug: "collectibles-hobbies", icon: "🧸", children: ["collectibles", "hobby-toys", "trading-cards", "anime", "gaming", "music", "books"] },
    { name: "Fashion & Accessories", slug: "fashion-accessories", icon: "👗", children: ["fashion", "jewelry", "bags", "streetwear", "beauty"] },
    { name: "Home & Living", slug: "home-and-living", icon: "🏠", children: ["home-living", "plants", "stationery"] },
    { name: "Filipino Finds", slug: "filipino", icon: "🇵🇭", children: ["filipino-finds", "local-brands"] },
    { name: "Tech & Gadgets", slug: "tech-gadgets", icon: "📱", children: ["tech"] },
    { name: "Baby, Kids & Pets", slug: "baby-kids-pets", icon: "👶", children: ["baby-kids", "pets"] },
    { name: "Automotive & Outdoor", slug: "automotive-outdoor", icon: "🏍️", children: ["automotive", "outdoor"] },
    { name: "Party & Events", slug: "party-events", icon: "🎉", children: ["party-wedding"] },
    {
      name: "Snacks & Pasalubong", slug: "food-and-snacks", icon: "🍪",
      children: ["food-snacks", "cookies", "candies", "chocolates", "chips", "nuts", "dried-snacks", "coffee-tea", "sauces-condiments", "spreads", "snack-boxes", "food-gift-boxes"],
    },
    {
      name: "Services", slug: "services", icon: "💼",
      children: ["illustration-art-commissions"],
    },
    {
      name: "Digital Products", slug: "digital-products", icon: "💾",
      children: [
        "stl-3d-print-designs", "canva-ppt-templates", "lightroom-presets-ps-actions", "ebooks-guides", "printables-planners", "fonts",
        "digital-art-wallpapers-stickers", "notion-templates", "website-shopify-themes", "ui-kits-figma-files", "mockups-icon-packs",
        "game-assets", "music-beats-sfx", "stock-photos-video", "video-templates", "craft-cut-files",
      ],
    },
  ];
  for (let i = 0; i < CATEGORY_GROUPS.length; i++) {
    const group = CATEGORY_GROUPS[i];
    const parent = await prisma.category.create({ data: { name: group.name, slug: group.slug, icon: group.icon, order: i } });
    for (let j = 0; j < group.children.length; j++) {
      const child = catBySlug[group.children[j]];
      if (child) await prisma.category.update({ where: { id: child.id }, data: { parentId: parent.id, order: j } });
    }
  }

  // ---------- Seller plans (official business rules — see /admin/pricing) ----------
  // update: is a real update, not {} — re-running the seed always corrects
  // these to the source-of-truth values below rather than leaving stale rows
  // from an earlier seed in place.
  const UNLIMITED_SEED = 999_999;
  const freePlanData = {
    code: "FREE", name: "Free", monthlyPrice: 0, transactionFeePercent: 10,
    maxActiveListings: 10, maxNewListingsPerMonth: 10, maxAuctionsPerWeek: 5, maxActiveAuctions: 3,
    maxProductsPerAuction: 1,
    features: ["BASIC_ANALYTICS", "BASIC_STOREFRONT", "BASIC_PROMOTIONS", "SELLER_BADGE", "STANDARD_SUPPORT"],
  };
  const proPlanData = {
    code: "PRO", name: "Pro", monthlyPrice: 699, transactionFeePercent: 10,
    maxActiveListings: 250, maxNewListingsPerMonth: 250, maxAuctionsPerWeek: 25, maxActiveAuctions: 15,
    maxProductsPerAuction: 1,
    features: ["ADVANCED_ANALYTICS", "ENHANCED_STOREFRONT", "PROMOTIONAL_TOOLS", "BULK_TOOLS", "SELLER_INSIGHTS", "PRIORITY_SUPPORT", "HIGH_VOLUME_TOOLS", "ADVANCED_SELLER_CONTROLS", "SELLER_BADGE"],
  };
  const premiumPlanData = {
    code: "PREMIUM", name: "Premium", monthlyPrice: 1999, transactionFeePercent: 8,
    maxActiveListings: UNLIMITED_SEED, maxNewListingsPerMonth: UNLIMITED_SEED, maxAuctionsPerWeek: UNLIMITED_SEED, maxActiveAuctions: UNLIMITED_SEED,
    maxProductsPerAuction: 1,
    features: ["ADVANCED_ANALYTICS", "DEEPER_INSIGHTS", "ADVANCED_STOREFRONT", "ADVANCED_PROMOTIONAL_TOOLS", "ADVANCED_BULK_TOOLS", "HIGH_VOLUME_TOOLS", "ADVANCED_SELLER_CONTROLS", "PRIORITY_SUPPORT", "PRIORITY_ACCESS", "SELLER_BADGE"],
  };
  // BIR_VERIFIED — the free tier a seller reaches by getting BIR-verified,
  // no subscription purchase involved (see verifyBirLicenseAction). Sits
  // between FREE/CASUAL (10 listings) and PRO (250): 50 active listings,
  // same 10% commission as FREE/PRO — only PREMIUM discounts that. The
  // auction sub-limits (15/week, 8 active) are interpolated between FREE and
  // PRO since the spec this was built from didn't set them explicitly, and
  // auctions are feature-flagged off right now anyway — revisit if/when
  // auctions come back.
  const birVerifiedPlanData = {
    code: "BIR_VERIFIED", name: "Verified", monthlyPrice: 0, transactionFeePercent: 10,
    maxActiveListings: 50, maxNewListingsPerMonth: 50, maxAuctionsPerWeek: 15, maxActiveAuctions: 8,
    maxProductsPerAuction: 1,
    features: ["BASIC_ANALYTICS", "BASIC_STOREFRONT", "BASIC_PROMOTIONS", "SELLER_BADGE", "STANDARD_SUPPORT"],
  };
  const freePlan = await prisma.sellerPlan.upsert({ where: { code: "FREE" }, update: freePlanData, create: freePlanData });
  const proPlan = await prisma.sellerPlan.upsert({ where: { code: "PRO" }, update: proPlanData, create: proPlanData });
  const premiumPlan = await prisma.sellerPlan.upsert({ where: { code: "PREMIUM" }, update: premiumPlanData, create: premiumPlanData });
  await prisma.sellerPlan.upsert({ where: { code: "BIR_VERIFIED" }, update: birVerifiedPlanData, create: birVerifiedPlanData });

  // Founding Premium — a real, selectable SellerPlan row (not a discount bolted
  // onto standard Premium) so it reuses all the normal subscribe/cancel/billing
  // plumbing. Only sellers with foundingPremiumEligible=true are ever allowed
  // to switch to it — enforced in changeSellerPlanAction, not here. Price-only
  // discount: same 8% commission as standard Premium, just a lower monthly fee.
  const foundingPremiumPlanData = {
    code: "FOUNDING_PREMIUM", name: "Founding Premium", monthlyPrice: 999, transactionFeePercent: 8,
    maxActiveListings: UNLIMITED_SEED, maxNewListingsPerMonth: UNLIMITED_SEED, maxAuctionsPerWeek: UNLIMITED_SEED, maxActiveAuctions: UNLIMITED_SEED,
    maxProductsPerAuction: 1,
    features: premiumPlanData.features,
  };
  await prisma.sellerPlan.upsert({ where: { code: "FOUNDING_PREMIUM" }, update: foundingPremiumPlanData, create: foundingPremiumPlanData });

  // ---------- Founding Seller Program (launch promotion, first 200 approved sellers) ----------
  await prisma.promotionCounter.create({ data: { id: FOUNDING_SELLER_CAMPAIGN_ID, count: 0, limit: FOUNDING_SELLER_LIMIT } });

  // ---------- Coupon campaigns (buyer-facing platform promotions) ----------
  const firstPurchaseCampaignData = {
    code: "FIRST_PURCHASE",
    name: "First-purchase welcome offer",
    discountType: "PERCENT",
    discountValue: 10,
    maxDiscount: 100,
    minSubtotal: null,
    scope: "PLATFORM",
    eligibility: "NEW_CUSTOMER",
    requiresMarketingOptIn: true,
    active: true,
  };
  await prisma.couponCampaign.upsert({
    where: { code: "FIRST_PURCHASE" },
    update: firstPurchaseCampaignData,
    create: firstPurchaseCampaignData,
  });

  // ---------- Promotion types (seller product promotions + event promotions, one pricing table) ----------
  const promotionTypeDefs = [
    { category: "PRODUCT", code: "BOOST", name: "Boost Listing", description: "Pushes one listing higher in Discover results for its run.", minPrice: 99, maxPrice: 149, unit: "PER_LISTING", order: 0 },
    { category: "PRODUCT", code: "FEATURED", name: "Featured Listing", description: "A larger, labeled card in Discover and category feeds.", minPrice: 199, maxPrice: 299, unit: "PER_LISTING", order: 1 },
    { category: "PRODUCT", code: "CATEGORY_FEATURE", name: "Category Feature", description: "Top placement on one category page for the week.", minPrice: 499, maxPrice: 999, unit: "PER_WEEK", order: 2 },
    { category: "PRODUCT", code: "HOMEPAGE_FEATURE", name: "Homepage Feature", description: "A spot in the homepage's sponsored row for the week.", minPrice: 1500, maxPrice: 3000, unit: "PER_WEEK", order: 3 },
    { category: "PRODUCT", code: "SPONSORED_CAMPAIGN", name: "Sponsored Campaign", description: "A multi-placement push across ATBP for bigger launches.", minPrice: 3000, maxPrice: 10000, unit: "PER_CAMPAIGN", order: 4 },
    { category: "EVENT", code: "EVENT_FEATURED", name: "Featured Event", description: "Higher placement on the Events page.", minPrice: 1500, maxPrice: 3000, unit: "PER_CAMPAIGN", order: 5 },
    { category: "EVENT", code: "EVENT_PROMOTED", name: "Promoted Event", description: "Top of Events plus a homepage mention.", minPrice: 5000, maxPrice: 15000, unit: "PER_CAMPAIGN", order: 6 },
    { category: "EVENT", code: "EVENT_MAJOR_CAMPAIGN", name: "Major Event Campaign", description: "Multi-placement push for a large market or convention.", minPrice: 20000, maxPrice: 50000, unit: "PER_CAMPAIGN", order: 7 },
    { category: "EVENT", code: "EVENT_SPONSORSHIP", name: "Event Sponsorship", description: "Full sponsorship package for a major ATBP community event.", minPrice: 50000, maxPrice: 250000, unit: "PER_CAMPAIGN", order: 8 },
  ];
  const promotionTypes = await Promise.all(
    promotionTypeDefs.map((p) => prisma.promotionType.upsert({ where: { code: p.code }, update: {}, create: p }))
  );
  const promoTypeByCode = Object.fromEntries(promotionTypes.map((p) => [p.code, p]));

  // ---------- Generic pricing config (see /admin/pricing) ----------
  // pro_monthly_credit_amount starts at 0 on purpose — ATBP Pro's promotional
  // credit grant isn't a fixed number the app assumes; it only starts
  // granting credits once an admin sets this above zero.
  await prisma.pricingConfig.upsert({
    where: { key: "pro_monthly_credit_amount" },
    update: {},
    create: { key: "pro_monthly_credit_amount", value: 0, description: "₱ of promotional credit granted to a seller each time their ATBP Pro subscription renews." },
  });

  // ---------- Demo accounts ----------
  const demoBuyer = await prisma.user.create({
    data: {
      email: "buyer@demo.atbp",
      passwordHash,
      name: "Maria Santos",
      username: "mariasantos",
      avatarUrl: avatar("mariasantos"),
      phone: "+639171234567",
      role: "BUYER",
      bio: "Always hunting for something worth finding. Based in QC.",
      area: "Quezon City",
    },
  });
  await prisma.cart.create({ data: { userId: demoBuyer.id } });
  await prisma.address.create({
    data: {
      userId: demoBuyer.id,
      fullName: "Maria Santos",
      phone: "+639171234567",
      line1: "12 Kalayaan Ave, Brgy. Pinyahan",
      city: "Quezon City",
      province: "Metro Manila",
      postalCode: "1100",
      isDefault: true,
    },
  });

  const demoAdmin = await prisma.user.create({
    data: {
      email: "admin@demo.atbp",
      passwordHash,
      name: "ATBP Admin",
      username: "atbpadmin",
      avatarUrl: avatar("atbpadmin"),
      role: "ADMIN",
    },
  });
  await prisma.cart.create({ data: { userId: demoAdmin.id } });

  // ---------- Filler buyers ----------
  const buyerNames = [
    "Jomari Dela Cruz", "Angela Reyes", "Kevin Tan", "Bea Villanueva", "Carlo Mendoza",
    "Nicole Bautista", "Paolo Garcia", "Trisha Ramos", "Miguel Torres", "Samantha Cruz",
    "J Fernandez", "Andrea Lim", "Rafael Aquino", "Kim Navarro", "Erika Domingo",
  ];
  const buyers = [];
  for (const name of buyerNames) {
    const username = name.toLowerCase().replace(/[^a-z]+/g, "").slice(0, 14) + Math.floor(Math.random() * 90 + 10);
    const u = await prisma.user.create({
      data: {
        email: `${username}@mail.atbp`,
        passwordHash,
        name,
        username,
        avatarUrl: avatar(username),
        role: "BUYER",
      },
    });
    await prisma.cart.create({ data: { userId: u.id } });
    buyers.push(u);
  }
  const allBuyers = [demoBuyer, ...buyers];

  // ---------- Sellers (Filipino makers, vintage dealers, collectors, artists) ----------
  const sellerDefs = [
    {
      email: "seller@demo.atbp", name: "Juana Dela Cruz", username: "tahitahistudio",
      shopName: "Tahi-Tahi Studio", handle: "tahitahistudio", category: "handmade",
      description: "Hand-embroidered pouches, coin purses, and linen bags — every stitch done by hand in a small home studio in Quezon City. Suki na suki, salamat sa suporta!",
      province: "Quezon City", verified: true, isDemo: true, badges: ["VERIFIED_MAKER"],
      local: {
        physicalPresence: "HOME_STUDIO",
        showExactAddress: false,
        pickupAvailable: true,
        pickupInstructions: "Message me to arrange a pickup time. Available weekdays 6-9PM near UP Town Center.",
        localDeliveryAvailable: true,
        localDeliveryFee: 60,
        localDeliveryAreas: ["Quezon City", "Metro Manila"],
      },
    },
    {
      email: "closet@demo.atbp", name: "Grace Villareal", username: "manilaclosetarchive",
      shopName: "Manila Closet Archive", handle: "manilaclosetarchive", category: "pre-loved",
      description: "Curated pre-loved clothing from real Manila closets — inspected, laundered, and photographed honestly. No surprises, just good finds.",
      province: "Manila City", verified: true, badges: ["VERIFIED_PRELOVED"],
      local: {
        physicalPresence: "HOME_STUDIO",
        showExactAddress: false,
        pickupAvailable: true,
        pickupInstructions: "Pickup by appointment only — DM to schedule. Located near España Blvd.",
      },
    },
    {
      email: "retroph@demo.atbp", name: "Ronnie Uy", username: "retrocebu",
      shopName: "Retro Cebu", handle: "retrocebu", category: "vintage",
      description: "Vintage radios, cameras, and household relics sourced from Cebu estate sales and old ukay bodegas. Cleaned, tested, and ready for a second life.",
      province: "Cebu City", verified: true, badges: ["VERIFIED_SELLER"],
      local: {
        physicalPresence: "PHYSICAL_STORE",
        showExactAddress: true,
        publicAddress: "Unit 12, Parian Heritage Row, Cebu City",
        pickupAvailable: true,
        pickupInstructions: "Walk-ins welcome during store hours. Ring the shop bell if the gate is closed.",
      },
    },
    {
      email: "denim@demo.atbp", name: "Ivy Salcedo", username: "davaodenimco",
      shopName: "Davao Denim Co.", handle: "davaodenimco", category: "fashion",
      description: "Handpicked thrifted denim and streetwear, one piece at a time, straight from Davao ukay runs.",
      province: "Davao City", badges: [],
    },
    {
      email: "collect@demo.atbp", name: "Marco Ilagan", username: "ilocoscollectibles",
      shopName: "Ilocos Collectibles", handle: "ilocoscollectibles", category: "collectibles",
      description: "Vintage toys, jeepney miniatures, and limited-run figures for Pinoy collectors. Every item comes with its story.",
      province: "Vigan City", verified: true, badges: ["VERIFIED_SELLER", "AUTHENTICATED"],
    },
    {
      email: "threads@demo.atbp", name: "Cathy Bermudez", username: "baguiothreads",
      shopName: "Baguio Threads", handle: "baguiothreads", category: "handmade",
      description: "Handloom-inspired knits and highland-dyed textiles, made and sourced from weaving communities around Baguio.",
      province: "Baguio City", verified: true, badges: ["VERIFIED_MAKER"],
    },
    {
      email: "clay@demo.atbp", name: "Dennis Ocampo", username: "lusongclayworks",
      shopName: "Luzon Clay Works", handle: "lusongclayworks", category: "home-living",
      description: "Wheel-thrown stoneware mugs, bowls, and vases, each one glazed and fired in a small backyard kiln in Pasig.",
      province: "Pasig City", badges: [],
      local: {
        physicalPresence: "WORKSHOP",
        showExactAddress: false,
        pickupAvailable: true,
        pickupInstructions: "Studio pickup available on weekends — message ahead so I can have your order ready.",
      },
    },
    {
      email: "sundries@demo.atbp", name: "Boyet Ramirez", username: "sundriesph",
      shopName: "Sundries PH", handle: "sundriesph", category: "local-brands",
      description: "A little bit of everything — capiz lamps, rattan trays, and small-batch home goods made by partner artisans across Cavite.",
      province: "Cavite City", badges: [],
      local: {
        physicalPresence: "MULTIPLE_LOCATIONS",
        showExactAddress: false,
        pickupAvailable: false,
      },
      multiLocations: [
        { label: "Cavite Warehouse", province: "Cavite City", pickupAvailable: true, pickupInstructions: "Weekday pickups, 9AM-5PM. Message ahead." },
        { label: "QC Pop-up Stall", province: "Quezon City", pickupAvailable: true, pickupInstructions: "Weekends only at the Maginhawa night market." },
      ],
    },
    {
      email: "garage@demo.atbp", name: "Ferdie Santos", username: "parkroadvintage",
      shopName: "Park Road Vintage", handle: "parkroadvintage", category: "vintage",
      description: "Vintage furniture and mid-century home pieces, restored by hand and delivered nationwide from Parañaque.",
      province: "Parañaque City", verified: true, badges: ["VERIFIED_SELLER"],
    },
    {
      email: "lola@demo.atbp", name: "Estrella Mabini", username: "lolaestrellasweave",
      shopName: "Lola Estrella's Weave", handle: "lolaestrellasweave", category: "filipino-finds",
      description: "Banig-woven bags and home accents, made by a cooperative of weavers in Bulacan led by Lola Estrella herself.",
      province: "Bulacan", verified: true, badges: ["VERIFIED_MAKER"],
    },
    {
      email: "canvas@demo.atbp", name: "Arnel Puno", username: "puntamalacanvas",
      shopName: "Punta Mala Canvas", handle: "puntamalacanvas", category: "art",
      description: "Original acrylic and ink paintings inspired by Manila Bay sunsets and jeepney color palettes. Originals and open-edition prints.",
      province: "Manila City", badges: [],
    },
    {
      email: "tech@demo.atbp", name: "Liza Cordova", username: "tikoystudio",
      shopName: "Tikoy Studio", handle: "tikoystudio", category: "custom",
      description: "Custom resin keychains, nameplates, and personalized gifts — every order made to your specs, based in Taguig.",
      province: "Taguig City", badges: [],
    },
    {
      email: "silver@demo.atbp", name: "Ana Bautista", username: "bagumbayansilver",
      shopName: "Bagumbayan Silver", handle: "bagumbayansilver", category: "handmade",
      description: "Hand-forged sterling silver jewelry inspired by Filipino folklore, made in a two-person atelier in Laguna.",
      province: "Santa Rosa City", verified: true, badges: ["VERIFIED_MAKER"],
    },
  ];

  const sellers: any[] = [];
  for (const s of sellerDefs) {
    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        name: s.name,
        username: s.username,
        avatarUrl: avatar(s.username),
        phone: "+639" + Math.floor(100000000 + Math.random() * 899999999),
        role: "SELLER",
        bio: s.description,
      },
    });
    await prisma.cart.create({ data: { userId: user.id } });
    const profile = await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        shopName: s.shopName,
        handle: s.handle,
        description: s.description,
        bannerUrl: u(pick([...PHOTOS.craftWorkshop, ...PHOTOS.potteryStudio]), 1400, 500),
        logoUrl: avatar(s.username),
        verified: !!s.verified,
        badges: s.badges ?? [],
        status: "APPROVED",
        // These are the marketplace's established craft/artisan shops — real
        // businesses with an ongoing catalog, not casual one-off resellers —
        // so they get BIR-verified by default. That's also what My Shop now
        // requires to list new products at all (Closet/Yard Sale is the path
        // for the unverified/casual persona instead).
        sellerKind: "BUSINESS",
        birVerified: true,
        birRegistrationNumber: birNumber(),
        rating: 4.4 + Math.random() * 0.55,
        ratingCount: Math.floor(20 + Math.random() * 400),
        totalSales: Math.floor(100 + Math.random() * 3000),
        followerCount: 0,
        province: s.province,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 300) * 86400000),
        ...(s.local
          ? {
              physicalPresence: s.local.physicalPresence,
              showExactAddress: s.local.showExactAddress,
              publicAddress: s.local.publicAddress ?? null,
              pickupAvailable: s.local.pickupAvailable,
              pickupInstructions: s.local.pickupInstructions ?? null,
              localDeliveryAvailable: s.local.localDeliveryAvailable ?? false,
              localDeliveryFee: s.local.localDeliveryFee ?? null,
              localDeliveryAreas: s.local.localDeliveryAreas ?? [],
            }
          : {}),
      },
    });

    if (s.local) {
      await prisma.shopHours.createMany({
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          sellerId: profile.id,
          dayOfWeek,
          closed: dayOfWeek === 0,
          opensAt: dayOfWeek === 0 ? null : dayOfWeek === 6 ? "10:00" : "09:00",
          closesAt: dayOfWeek === 0 ? null : dayOfWeek === 6 ? "15:00" : "18:00",
          open24h: false,
          byAppointment: false,
        })),
      });
    }

    if (s.multiLocations) {
      for (const loc of s.multiLocations) {
        const location = await prisma.sellerLocation.create({
          data: {
            sellerId: profile.id,
            label: loc.label,
            province: loc.province,
            pickupAvailable: loc.pickupAvailable ?? false,
            pickupInstructions: loc.pickupInstructions ?? null,
          },
        });
        await prisma.sellerLocationHours.createMany({
          data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            locationId: location.id,
            dayOfWeek,
            closed: dayOfWeek === 0,
            opensAt: dayOfWeek === 0 ? null : "10:00",
            closesAt: dayOfWeek === 0 ? null : "17:00",
            open24h: false,
            byAppointment: false,
          })),
        });
      }
    }

    sellers.push({ user, profile, category: s.category, isDemo: !!s.isDemo, local: !!s.local });
  }

  const oneApplicantUser = await prisma.user.create({
    data: {
      email: "pending@demo.atbp",
      passwordHash,
      name: "Rico Villamor",
      username: "ricoprintsph",
      avatarUrl: avatar("ricoprintsph"),
      role: "SELLER",
      bio: "Aspiring risograph print maker, first-time ATBP seller.",
    },
  });
  await prisma.cart.create({ data: { userId: oneApplicantUser.id } });
  await prisma.sellerProfile.create({
    data: {
      userId: oneApplicantUser.id,
      shopName: "Rico Prints PH",
      handle: "ricoprintsph",
      description: "First-time seller applying to sell riso-printed art zines and postcards.",
      status: "PENDING",
      province: "Iloilo City",
    },
  });

  // ---------- Products ----------
  const productBank: Record<
    string,
    { title: string; desc: string; min: number; max: number; type: string; conditions?: string[]; images: string[] }[]
  > = {
    handmade_pouch: [
      { title: "Hand-Embroidered Coin Pouch", desc: "Freehand floral embroidery on natural linen, fully lined, brass zipper.", min: 350, max: 750, type: "HANDMADE", images: photos(PHOTOS.embroidery.slice(0, 2)) },
      { title: "Sampaguita Stitch Sling Bag", desc: "One-of-a-kind embroidery, no two pieces alike. Adjustable strap.", min: 900, max: 1800, type: "HANDMADE", images: photos(PHOTOS.embroidery.slice(2, 4)) },
      { title: "Linen Zip Pouch Trio", desc: "Set of three hand-sewn pouches in small, medium, and large.", min: 550, max: 950, type: "HANDMADE", images: photos(PHOTOS.embroidery.slice(4, 6)) },
      { title: "Embroidered Passport Holder", desc: "Hand-stitched cover with a hidden card slot, made to order.", min: 450, max: 800, type: "CUSTOM", images: photos([PHOTOS.embroidery[0], PHOTOS.embroidery[4]]) },
    ],
    pre_loved_closet: [
      { title: "Vintage Silk Barong Blouse", desc: "From a 1990s Manila wardrobe, gently worn, dry-cleaned and pressed.", min: 650, max: 1600, type: "PRE_LOVED", conditions: ["EXCELLENT", "GOOD"], images: photos(PHOTOS.barong.slice(0, 2)) },
      { title: "Pre-Loved Leather Loafers", desc: "Genuine leather, light creasing, resoled and conditioned.", min: 1200, max: 2800, type: "PRE_LOVED", conditions: ["GOOD", "EXCELLENT"], images: photos(PHOTOS.loafers) },
      { title: "Thrifted Wool Trench Coat", desc: "Warm European wool blend, rare find in tropical thrift runs.", min: 1500, max: 3200, type: "PRE_LOVED", conditions: ["LIKE_NEW", "EXCELLENT"], images: photos(PHOTOS.trenchCoat) },
      { title: "Vintage Denim Jacket", desc: "Faded wash, honest photos of all wear included in the listing.", min: 850, max: 1900, type: "PRE_LOVED", conditions: ["GOOD", "FAIR"], images: photos(PHOTOS.denimJacket) },
    ],
    vintage_home: [
      { title: "1970s Transistor Radio", desc: "Fully tested, original knobs, minor casing wear from age.", min: 1800, max: 3800, type: "VINTAGE", conditions: ["GOOD", "EXCELLENT"], images: photos(PHOTOS.antiqueRadio.slice(0, 2)) },
      { title: "Vintage Film Camera (Working)", desc: "Shutter tested, light seals replaced, comes with original strap.", min: 2200, max: 5200, type: "VINTAGE", conditions: ["EXCELLENT", "GOOD"], images: photos(PHOTOS.vintageCamera.slice(0, 2)) },
      { title: "Capiz Shell Pendant Lamp", desc: "Salvaged from an old Cebu ancestral house, rewired for safety.", min: 2800, max: 6500, type: "VINTAGE", conditions: ["GOOD", "FAIR"], images: photos(PHOTOS.capizLamp) },
      { title: "Retro Enamel Kitchen Canister Set", desc: "Set of four, some patina consistent with age, no rust.", min: 900, max: 2100, type: "VINTAGE", conditions: ["GOOD", "EXCELLENT"], images: photos(PHOTOS.enamelCanisters) },
    ],
    collectibles: [
      { title: "Hand-Painted Jeepney Diecast Model", desc: "1:32 scale, hand-painted collector's edition with display stand.", min: 900, max: 2200, type: "COLLECTIBLE", images: photos(PHOTOS.diecast) },
      { title: "Limited-Run Anito Figure", desc: "Resin-cast, numbered edition of 100, certificate included.", min: 1800, max: 4500, type: "COLLECTIBLE", images: photos(PHOTOS.carvedFigure) },
      { title: "Vintage Comic Book Bundle", desc: "Bagged and boarded Pinoy komiks reprints, near-mint condition.", min: 600, max: 1800, type: "COLLECTIBLE", conditions: ["EXCELLENT"], images: photos(PHOTOS.comicBooks) },
      { title: "1990s Trading Card Binder", desc: "Complete regional set, sleeved and organized by year.", min: 1500, max: 5500, type: "COLLECTIBLE", conditions: ["GOOD", "EXCELLENT"], images: photos(PHOTOS.tradingCards) },
    ],
    art: [
      { title: "\"Manila Bay, Dusk\" Original Painting", desc: "Acrylic on canvas, 18x24in, signed and dated, ready to hang.", min: 3500, max: 9500, type: "ART", images: photos(PHOTOS.seascapePainting) },
      { title: "Jeepney Colors Print (Open Edition)", desc: "Giclée print on archival paper, 12x16in, unframed.", min: 650, max: 1200, type: "ART", images: photos(PHOTOS.jeepney) },
      { title: "Ink Portrait Commission", desc: "Custom pen-and-ink portrait from your photo, digital + print copy.", min: 1200, max: 2800, type: "CUSTOM", images: photos(PHOTOS.inkPortrait) },
      { title: "Mini Canvas Study Series", desc: "Set of 3 small studies, 6x6in each, great for gallery walls.", min: 900, max: 1900, type: "ART", images: photos(PHOTOS.miniCanvas) },
    ],
    custom_gifts: [
      { title: "Custom Resin Nameplate Keychain", desc: "Personalized name and color, made to order in 3-5 days.", min: 250, max: 550, type: "CUSTOM", images: photos(PHOTOS.resinKeychain) },
      { title: "Custom Family Portrait Ornament", desc: "Hand-poured resin ornament with a printed family photo.", min: 450, max: 850, type: "CUSTOM", images: photos(PHOTOS.resinOrnament) },
      { title: "Personalized Wooden Cake Topper", desc: "Laser-cut and hand-finished, any name or phrase.", min: 350, max: 700, type: "CUSTOM", images: photos(PHOTOS.cakeTopper) },
    ],
    home_ceramics: [
      { title: "Wheel-Thrown Stoneware Mug", desc: "Food-safe glaze, holds 300ml, slightly unique per piece.", min: 450, max: 950, type: "HANDMADE", images: photos(PHOTOS.ceramicMug) },
      { title: "Speckled Clay Serving Bowl Set", desc: "Set of 4 small bowls, hand-glazed in a single kiln batch.", min: 1200, max: 2600, type: "HANDMADE", images: photos(PHOTOS.ceramicBowls) },
      { title: "Handbuilt Ceramic Vase", desc: "One-of-a-kind form, food-safe interior glaze.", min: 950, max: 2200, type: "HANDMADE", images: photos(PHOTOS.ceramicVase) },
    ],
    small_shop_home: [
      { title: "Rattan Serving Tray", desc: "Woven by partner artisans in Cavite, sealed for daily use.", min: 650, max: 1400, type: "HANDMADE", images: photos(PHOTOS.rattanTray) },
      { title: "Capiz Shell Wind Chime", desc: "Traditional capiz craftsmanship, soft chime tone.", min: 550, max: 1100, type: "HANDMADE", images: photos(PHOTOS.windChime) },
      { title: "Small-Batch Coconut Candle", desc: "Poured in reused coconut shells, natural soy wax.", min: 280, max: 550, type: "HANDMADE", images: photos(PHOTOS.coconutCandle) },
      { title: "Handloom Table Runner", desc: "Inabel-inspired weave, 100% cotton, machine washable.", min: 700, max: 1500, type: "HANDMADE", images: photos(PHOTOS.tableRunner) },
    ],
    vintage_furniture: [
      { title: "Restored Narra Accent Chair", desc: "Solid narra frame, reupholstered seat, minor structural repairs done.", min: 4500, max: 9800, type: "VINTAGE", conditions: ["GOOD", "EXCELLENT"], images: photos(PHOTOS.vintageChair) },
      { title: "Mid-Century Bar Cart", desc: "Rattan and glass, wheels replaced, structurally sound.", min: 3200, max: 6800, type: "VINTAGE", conditions: ["GOOD", "FAIR"], images: photos(PHOTOS.barCart) },
      { title: "Vintage Sewing Machine (Singer)", desc: "Treadle-powered, fully functional, cast iron base intact.", min: 3800, max: 7500, type: "VINTAGE", conditions: ["EXCELLENT", "GOOD"], images: photos(PHOTOS.sewingMachine) },
    ],
    weave: [
      { title: "Banig-Woven Tote Bag", desc: "Handwoven pandan leaf tote, leather handles, lined interior.", min: 850, max: 1700, type: "HANDMADE", images: photos(PHOTOS.toteBag) },
      { title: "Woven Placemat Set (6pc)", desc: "Traditional banig weave, made by a Bulacan weaving cooperative.", min: 600, max: 1200, type: "HANDMADE", images: photos(PHOTOS.placemats) },
      { title: "Banig Wall Hanging", desc: "Large-format woven wall art, natural dyes, ready to hang.", min: 1400, max: 2900, type: "HANDMADE", images: photos(PHOTOS.wallHanging) },
    ],
    jewelry: [
      { title: "Hand-Forged Silver Cuff", desc: "Sterling silver, hammered finish, one-size-fits-most.", min: 1500, max: 3200, type: "HANDMADE", images: photos(PHOTOS.silverCuff) },
      { title: "Sarimanok Pendant Necklace", desc: "Folklore-inspired pendant, sterling silver chain included.", min: 1200, max: 2600, type: "HANDMADE", images: photos(PHOTOS.pendant) },
      { title: "Custom Engraved Ring", desc: "Sterling silver band, engraved with your chosen text.", min: 900, max: 2000, type: "CUSTOM", images: photos(PHOTOS.engravedRing) },
    ],
  };

  const bankByCategory: Record<string, (typeof productBank)[string][]> = {
    handmade: [productBank.handmade_pouch, productBank.jewelry],
    "pre-loved": [productBank.pre_loved_closet],
    vintage: [productBank.vintage_home, productBank.vintage_furniture],
    collectibles: [productBank.collectibles],
    art: [productBank.art],
    custom: [productBank.custom_gifts],
    "filipino-finds": [productBank.weave],
    "local-brands": [productBank.small_shop_home],
    "hobby-toys": [productBank.collectibles],
    fashion: [productBank.pre_loved_closet],
    "home-living": [productBank.home_ceramics],
  };

  const products: any[] = [];
  for (const seller of sellers) {
    const banks = bankByCategory[seller.category] ?? [productBank.small_shop_home];
    const bank = pick(banks);
    const count = 8 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      const base = bank[i % bank.length];
      const price = pesoRandom(base.min, base.max);
      const isOneOfOne = Math.random() < 0.35;
      const qty = isOneOfOne ? 1 : Math.floor(2 + Math.random() * 8);
      const condition = base.conditions ? pick(base.conditions) : "BRAND_NEW";

      const product = await prisma.product.create({
        data: {
          sellerId: seller.profile.id,
          categoryId: catBySlug[seller.category].id,
          title: base.title,
          description: base.desc,
          images: base.images,
          price,
          compareAtPrice: Math.random() < 0.25 ? Math.round(price * 1.2) : null,
          quantity: qty,
          quantityAvailable: qty,
          type: base.type,
          condition,
          sku: `${seller.profile.handle.slice(0, 4).toUpperCase()}-${1000 + i}`,
          status: "ACTIVE",
          sellingModes: ["BUY_NOW"],
          shippingInfo: "Ships via J&T Express or LBC. Cash on delivery available in select areas.",
          likeCount: Math.floor(Math.random() * 300),
          viewCount: Math.floor(Math.random() * 3000),
          soldCount: Math.floor(Math.random() * (qty + 40)),
          tags: autoTags({ type: base.type, categorySlug: seller.category, price }),
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 60) * 86400000),
          pickupAvailable: seller.local && i < 2,
          localDeliveryAvailable: seller.local && i < 2,
        },
      });
      products.push({ product, seller });
    }
  }

  // ---------- Marketplace density pass — 37 additional niche sellers ----------
  console.log(`Seeding ${NEW_SELLERS.length} additional demo sellers...`);
  for (const s of NEW_SELLERS) {
    const rep = reputationForTier(s.tier);
    const physicalPresence = s.physicalPresence ?? "ONLINE_ONLY";
    const badges = badgesForTier(s.tier, physicalPresence, !!s.pickupAvailable);
    const ageDays = s.tier === "NEW" ? 20 : s.tier === "TRUSTED" ? 200 : s.tier === "ESTABLISHED" ? 450 : 650;

    const user = await prisma.user.create({
      data: {
        email: s.email,
        passwordHash,
        name: s.name,
        username: s.username,
        avatarUrl: avatar(s.username),
        phone: "+639" + Math.floor(100000000 + Math.random() * 899999999),
        role: "SELLER",
        bio: s.description,
      },
    });
    await prisma.cart.create({ data: { userId: user.id } });

    const profile = await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        shopName: s.shopName,
        handle: s.handle,
        description: s.description,
        story: s.story,
        bannerUrl: u(pick([...PHOTOS.craftWorkshop, ...PHOTOS.potteryStudio]), 1400, 500),
        logoUrl: avatar(s.username),
        verified: s.tier === "TOP" || s.tier === "ESTABLISHED",
        badges,
        status: "APPROVED",
        rating: Math.round(rep.rating * 100) / 100,
        ratingCount: rep.ratingCount,
        totalSales: rep.totalSales,
        followerCount: Math.floor(rep.ratingCount * (1.2 + Math.random() * 1.5)),
        province: s.province,
        physicalPresence,
        pickupAvailable: !!s.pickupAvailable,
        showExactAddress: false,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * ageDays) * 86400000),
      },
    });

    if (physicalPresence !== "ONLINE_ONLY") {
      await prisma.shopHours.createMany({
        data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          sellerId: profile.id,
          dayOfWeek,
          closed: dayOfWeek === 0,
          opensAt: dayOfWeek === 0 ? null : dayOfWeek === 6 ? "10:00" : "09:00",
          closesAt: dayOfWeek === 0 ? null : dayOfWeek === 6 ? "15:00" : "18:00",
          open24h: false,
          byAppointment: false,
        })),
      });
    }

    const sellerEntry = { user, profile, category: s.category, isDemo: false, local: physicalPresence !== "ONLINE_ONLY" };
    sellers.push(sellerEntry);

    for (const p of s.products) {
      const qty = Math.random() < 0.3 ? 1 : Math.floor(2 + Math.random() * 10);
      const categorySlug = p.categorySlug ?? s.category;
      const tags = new Set([...(p.tags ?? []), ...autoTags({ type: p.type, categorySlug, price: p.price })]);
      const product = await prisma.product.create({
        data: {
          sellerId: profile.id,
          categoryId: catBySlug[categorySlug].id,
          title: p.title,
          description: p.desc,
          images: p.images,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          quantity: qty,
          quantityAvailable: qty,
          type: p.type,
          condition: p.condition ?? "BRAND_NEW",
          sku: `${s.handle.slice(0, 4).toUpperCase()}-${1000 + Math.floor(Math.random() * 9000)}`,
          status: "ACTIVE",
          sellingModes: ["BUY_NOW"],
          shippingInfo: "Ships via J&T Express or LBC. Cash on delivery available in select areas.",
          likeCount: Math.floor(Math.random() * (rep.totalSales / 2 + 60)),
          viewCount: Math.floor(Math.random() * 3500),
          soldCount: Math.floor(Math.random() * Math.min(250, rep.totalSales + 5)),
          tags: [...tags],
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 75) * 86400000),
          ...(p.food
            ? {
                isFood: true,
                shelfStable: p.food.shelfStable ?? false,
                expiryInfo: p.food.expiryInfo,
                ingredients: p.food.ingredients,
                allergens: p.food.allergens,
                foodShippingNotes: p.food.foodShippingNotes,
              }
            : {}),
        },
      });
      products.push({ product, seller: sellerEntry });
    }
  }

  // ---------- Free Near You demo listings ----------
  const freeSeller = sellers.find((s) => s.profile.handle === "tahitahistudio");
  if (freeSeller) {
    const freeProduct = await prisma.product.create({
      data: {
        sellerId: freeSeller.profile.id,
        categoryId: catBySlug.handmade.id,
        title: "Scrap Fabric Bundle (Free — Just Pay Pickup)",
        description: "Leftover linen and cotton scraps from past orders — perfect for small craft projects. First come, first served.",
        images: photos(PHOTOS.embroidery.slice(0, 2)),
        price: 0,
        quantity: 3,
        quantityAvailable: 3,
        type: "HANDMADE",
        condition: "GOOD",
        status: "ACTIVE",
        sellingModes: ["BUY_NOW"],
        shippingAvailable: false,
        pickupAvailable: true,
        likeCount: 12,
        viewCount: 140,
      },
    });
    products.push({ product: freeProduct, seller: freeSeller });
  }

  // ---------- ATBP Markets ----------
  const marketDefs = [
    { name: "ATBP Manila Weekend Market", city: "Manila City", tagline: "Sunday makers & vintage market at Intramuros", imageUrl: u(PHOTOS.craftMarket[0], 1200, 800), schedule: "Sundays, 8am-4pm", order: 0 },
    { name: "Quezon City Maker's Row", city: "Quezon City", tagline: "Monthly indie craft fair at Circle Park", imageUrl: u(PHOTOS.craftMarket[1], 1200, 800), schedule: "First Saturday of the month", order: 1 },
    { name: "Cebu Heritage Bazaar", city: "Cebu City", tagline: "Antiques, weaves, and local art in the old Parian district", imageUrl: u(PHOTOS.craftMarket[2], 1200, 800), schedule: "Saturdays, 9am-6pm", order: 2 },
    { name: "Davao Artisan Grounds", city: "Davao City", tagline: "Mindanao makers, coffee, and craft under one roof", imageUrl: u(PHOTOS.craftMarket[3], 1200, 800), schedule: "Weekends, 10am-8pm", order: 3 },
    { name: "Baguio Weaver's Market", city: "Baguio City", tagline: "Highland textiles and cool-climate crafts", imageUrl: u(PHOTOS.craftMarket[4], 1200, 800), schedule: "Fridays-Sundays", order: 4 },
  ];
  await Promise.all(marketDefs.map((m) => prisma.market.create({ data: m })));

  // ---------- Looking For (buyer requests) ----------
  const lookingForDefs = [
    {
      buyer: demoBuyer, title: "Vintage Nikon FM2 film camera", area: "Quezon City",
      description: "Looking for a working Nikon FM2 or similar fully manual film camera, any condition as long as the shutter works. Willing to pay for a CLA if needed.",
      category: "vintage", budgetMin: 3000, budgetMax: 8000,
    },
    {
      buyer: buyers[0], title: "Capiz lamp shade, medium size", area: "Cavite City",
      description: "Need a capiz shell lamp shade for a pendant light, roughly 12-14 inches wide. Natural/cream color preferred.",
      category: "local-brands", budgetMin: 500, budgetMax: 1500,
    },
    {
      buyer: buyers[1], title: "Hand-forged silver ring, size 7", area: "Santa Rosa City",
      description: "Looking for a simple hammered-finish sterling silver band, US size 7. Open to custom orders.",
      category: "handmade",
    },
  ];
  for (const def of lookingForDefs) {
    const post = await prisma.lookingForPost.create({
      data: {
        userId: def.buyer.id,
        title: def.title,
        description: def.description,
        area: def.area,
        categoryId: catBySlug[def.category]?.id,
        budgetMin: def.budgetMin,
        budgetMax: def.budgetMax,
        createdAt: randomTimeWithin(0, 10),
      },
    });
    if (def.title.startsWith("Hand-forged")) {
      const silverSeller = sellers.find((s) => s.profile.handle === "bagumbayansilver");
      if (silverSeller) {
        await prisma.lookingForReply.create({
          data: {
            postId: post.id,
            sellerId: silverSeller.profile.id,
            message: "I can make this to order — hammered finish, size 7, ready in about a week. Message me and I'll send photos of past pieces!",
          },
        });
      }
    }
  }

  // ---------- Monetization demo data ----------

  // One seller on ATBP Pro, so the plan/limits/commission UI has something real to show.
  const proSeller = sellers[0]; // Tahi-Tahi Studio
  await prisma.sellerProfile.update({
    where: { id: proSeller.profile.id },
    data: {
      announcement: "New pieces going up this Saturday — restocking coin pouches and tote bags.",
      socialLinks: { facebook: "https://facebook.com/tahitahistudio", instagram: "https://instagram.com/tahitahistudio" },
      returnPolicy: "Returns accepted within 7 days of delivery for unused, unwashed items with tags attached. Buyer covers return shipping unless the item arrived damaged or wasn't what was ordered. Custom and made-to-order pieces are final sale.",
    },
  });
  // A second seller with no return policy set, so the "seller hasn't posted one" fallback has a real example too.
  await prisma.sellerProfile.update({
    where: { id: sellers[1].profile.id },
    data: { returnPolicy: "Ukay/pre-loved items are sold as-is. Please check photos and measurements before ordering — no returns on pre-loved pieces, but message me if something arrives significantly different from the listing." },
  });
  const proSellerProducts = products.filter((p) => p.seller.profile.id === proSeller.profile.id).slice(0, 3);
  for (const p of proSellerProducts) {
    await prisma.product.update({ where: { id: p.product.id }, data: { featured: true } });
  }
  await prisma.sellerSubscription.create({
    data: {
      sellerId: proSeller.profile.id,
      planId: proPlan.id,
      status: "ACTIVE",
      provider: "MOCK",
      startedAt: daysFromNow(-12),
      currentPeriodEnd: daysFromNow(18),
    },
  });
  await prisma.promotionalCredit.create({
    data: { sellerId: proSeller.profile.id, amount: 300, source: "ADMIN_GRANT", createdAt: daysFromNow(-12) },
  });
  await prisma.promotionalCredit.create({
    data: { sellerId: proSeller.profile.id, amount: -99, source: "PROMOTION_SPEND", createdAt: daysFromNow(-3) },
  });

  // A second demo seller on Premium, so the top tier has real data to show too.
  const premiumSeller = sellers[2];
  await prisma.sellerSubscription.create({
    data: {
      sellerId: premiumSeller.profile.id,
      planId: premiumPlan.id,
      status: "ACTIVE",
      provider: "MOCK",
      startedAt: daysFromNow(-40),
      currentPeriodEnd: daysFromNow(20),
    },
  });

  // ---------- Founding Seller Program demo data ----------
  // Each grant goes through the real maybeGrantFoundingSeller — including the
  // BIR-verified-business gate — so the 1/2/3 slot numbering and the
  // PromotionCounter are genuinely exercised; only the resulting dates are
  // then backdated for a realistic demo spread.
  await prisma.sellerProfile.update({
    where: { id: sellers[6].profile.id },
    data: { sellerKind: "BUSINESS", birRegistrationNumber: "123-456-789-000", birVerified: true },
  });
  const foundingClayWorks = await maybeGrantFoundingSeller(sellers[6].profile.id); // Luzon Clay Works — early in their free year
  if (foundingClayWorks) {
    await prisma.sellerProfile.update({
      where: { id: sellers[6].profile.id },
      data: { foundingSellerStartDate: daysFromNow(-30), foundingSellerProEndDate: daysFromNow(335) },
    });
  }

  await prisma.sellerProfile.update({
    where: { id: sellers[7].profile.id },
    data: { sellerKind: "BUSINESS", birRegistrationNumber: "234-567-891-000", birVerified: true },
  });
  const foundingSundries = await maybeGrantFoundingSeller(sellers[7].profile.id); // Sundries PH — free year ended, upgraded to Founding Premium
  if (foundingSundries) {
    await prisma.sellerProfile.update({
      where: { id: sellers[7].profile.id },
      data: { foundingSellerStartDate: daysFromNow(-400), foundingSellerProEndDate: daysFromNow(-35) },
    });
    const foundingPremiumPlan = await prisma.sellerPlan.findUniqueOrThrow({ where: { code: "FOUNDING_PREMIUM" } });
    await prisma.sellerSubscription.create({
      data: {
        sellerId: sellers[7].profile.id,
        planId: foundingPremiumPlan.id,
        status: "ACTIVE",
        provider: "MOCK",
        startedAt: daysFromNow(-33),
        currentPeriodEnd: daysFromNow(27),
      },
    });
  }

  await prisma.sellerProfile.update({
    where: { id: sellers[9].profile.id },
    data: { sellerKind: "BUSINESS", birRegistrationNumber: "345-678-912-000", birVerified: true },
  });
  const foundingWeave = await maybeGrantFoundingSeller(sellers[9].profile.id); // Lola Estrella's Weave — free window ends in 25 days, for the "ending soon" upgrade messaging
  if (foundingWeave) {
    await prisma.sellerProfile.update({
      where: { id: sellers[9].profile.id },
      data: { foundingSellerStartDate: daysFromNow(-340), foundingSellerProEndDate: daysFromNow(25) },
    });
  }

  // A trusted long-time seller gets a manual limit bump instead of a plan change.
  await prisma.sellerPlanOverride.create({
    data: {
      sellerId: sellers[4].profile.id, // Ilocos Collectibles
      activeListingLimitOverride: 20,
      reason: "Longtime seller, consistently within policy — bumped past the Free cap by support.",
    },
  });

  // A couple of purchased placements so "Sponsored"/"Promoted" labels have something real behind them.
  const boostedListing = products.find((p) => p.seller.profile.id === proSeller.profile.id);
  if (boostedListing) {
    await prisma.promotion.create({
      data: {
        sellerId: proSeller.profile.id,
        productId: boostedListing.product.id,
        promotionTypeId: promoTypeByCode.BOOST.id,
        price: 129,
        placement: "DISCOVER",
        startAt: daysFromNow(-1),
        endAt: daysFromNow(6),
        status: "ACTIVE",
        impressions: 1840,
        clicks: 62,
      },
    });
  }
  const featuredListing = products.find((p) => p.seller.profile.id === sellers[2].profile.id);
  if (featuredListing) {
    await prisma.promotion.create({
      data: {
        sellerId: sellers[2].profile.id,
        productId: featuredListing.product.id,
        promotionTypeId: promoTypeByCode.HOMEPAGE_FEATURE.id,
        price: 2200,
        placement: "HOMEPAGE",
        startAt: daysFromNow(-2),
        endAt: daysFromNow(5),
        status: "ACTIVE",
        impressions: 9400,
        clicks: 310,
      },
    });
  }

  // ---------- Third-party advertising (kept separate from seller promotions) ----------
  const jntAdvertiser = await prisma.advertiser.create({
    data: { name: "J&T Express", contactName: "Partnerships Team", contactEmail: "partners@example-jnt.ph", status: "APPROVED" },
  });
  const jntCampaign = await prisma.adCampaign.create({
    data: { advertiserId: jntAdvertiser.id, name: "Reliable Nationwide Delivery", budget: 50000, status: "ACTIVE", startAt: daysFromNow(-5), endAt: daysFromNow(25) },
  });
  const jntAd = await prisma.advertisement.create({
    data: {
      campaignId: jntCampaign.id,
      creativeImageUrl: u(PHOTOS.craftMarket[0], 1200, 400),
      destinationUrl: "https://www.jtexpress.ph",
      cpc: 5,
      status: "ACTIVE",
      impressions: 12400,
      clicks: 118,
    },
  });
  await prisma.adPlacement.create({ data: { advertisementId: jntAd.id, placement: "HOMEPAGE" } });

  // ---------- Events ----------
  const eventDefs = [
    {
      name: "Manila Vintage & Flea Weekend",
      coverImage: u(PHOTOS.craftMarket[0], 1200, 800),
      description: "A weekend of vintage clothing racks, pre-loved finds, and secondhand treasure-hunting at Intramuros.",
      eventDate: daysFromNow(9),
      startTime: "8:00 AM", endTime: "4:00 PM",
      venue: "Intramuros Grounds", city: "Manila City", address: "General Luna St, Intramuros, Manila",
      admissionPrice: "Free", websiteUrl: "https://example.com/manila-vintage-flea",
      categories: ["Vintage", "Pre-Loved"], organiserName: "Manila Flea Collective",
      sellerIdxs: [0, 2, 8],
    },
    {
      name: "Ilocos Collectibles & Card Show",
      coverImage: u(PHOTOS.craftMarket[1], 1200, 800),
      description: "Trading cards, vintage toys, and limited-run figures from collectors across Northern Luzon.",
      eventDate: daysFromNow(21),
      startTime: "9:00 AM", endTime: "6:00 PM",
      venue: "Vigan Convention Center", city: "Vigan City", address: "Quezon Ave, Vigan City, Ilocos Sur",
      admissionPrice: "₱100", websiteUrl: "https://example.com/ilocos-card-show",
      categories: ["Collectibles"], organiserName: "Ilocos Collectors Guild",
      sellerIdxs: [4],
    },
    {
      name: "Baguio Handmade & Weaver's Fair",
      coverImage: u(PHOTOS.craftMarket[4], 1200, 800),
      description: "Highland weavers, potters, and handmade-goods sellers set up in the cool Baguio air.",
      eventDate: daysFromNow(35),
      startTime: "10:00 AM", endTime: "7:00 PM",
      venue: "Burnham Park", city: "Baguio City", address: "Burnham Park, Baguio City",
      admissionPrice: "Free", websiteUrl: null,
      categories: ["Handmade", "Art"], organiserName: "Baguio Threads",
      sellerIdxs: [5, 10],
    },
    {
      name: "Cebu Heritage Art Market",
      coverImage: u(PHOTOS.craftMarket[2], 1200, 800),
      description: "Local painters, printmakers, and custom-portrait artists showcase work in the old Parian district.",
      eventDate: daysFromNow(-14),
      startTime: "9:00 AM", endTime: "5:00 PM",
      venue: "Parian Plaza", city: "Cebu City", address: "Parian, Cebu City",
      admissionPrice: "Free", websiteUrl: null,
      categories: ["Art"], organiserName: "Cebu Heritage Bazaar",
      sellerIdxs: [10, 11],
    },
    {
      name: "Quezon City Toy & Collectibles Fair",
      coverImage: u(PHOTOS.craftMarket[1], 1200, 800),
      description: "Squishies, trading cards, anime figures, and brick sets under one roof — a collector's dream weekend.",
      eventDate: daysFromNow(18),
      startTime: "10:00 AM", endTime: "7:00 PM",
      venue: "SM City Fairview Trade Hall", city: "Quezon City", address: "Regalado Ave, Fairview, Quezon City",
      admissionPrice: "₱50", websiteUrl: null,
      categories: ["Collectibles", "Toys"], organiserName: "QC Collectors Circle",
      sellerIdxs: [sellerIdx("squishandsqueezeph"), sellerIdx("cardboardkingdomph"), sellerIdx("otakutambayan"), sellerIdx("brickandblockph")],
    },
    {
      name: "Manila Gaming & Card Meetup",
      coverImage: u(PHOTOS.craftMarket[0], 1200, 800),
      description: "Retro consoles, trading card trading, and a swap table for collectors and gamers.",
      eventDate: daysFromNow(26),
      startTime: "11:00 AM", endTime: "6:00 PM",
      venue: "Warehouse Eight", city: "Manila City", address: "United Nations Ave, Manila",
      admissionPrice: "Free", websiteUrl: null,
      categories: ["Gaming", "Trading Cards"], organiserName: "Manila Gamers Guild",
      sellerIdxs: [sellerIdx("respawnmanila"), sellerIdx("cardboardkingdomph"), sellerIdx("groovemanila")],
    },
  ];

  for (const def of eventDefs) {
    const { sellerIdxs, ...eventData } = def;
    const status = eventData.eventDate < new Date() ? "ENDED" : "UPCOMING";
    const event = await prisma.event.create({ data: { ...eventData, status } });
    for (const idx of sellerIdxs) {
      await prisma.eventSeller.create({ data: { eventId: event.id, sellerId: sellers[idx].profile.id } });
    }
    await prisma.eventInterest.create({ data: { eventId: event.id, userId: demoBuyer.id, type: "INTERESTED" } });
  }

  // A featured event promotion, so the "Featured"/"Promoted" labels on Events have a real example too.
  const firstEvent = await prisma.event.findFirst({ where: { name: "Manila Vintage & Flea Weekend" } });
  if (firstEvent) {
    await prisma.eventPromotion.create({
      data: {
        eventId: firstEvent.id,
        promotionTypeId: promoTypeByCode.EVENT_FEATURED.id,
        price: 2000,
        startAt: daysFromNow(-1),
        endAt: daysFromNow(9),
        status: "ACTIVE",
      },
    });
  }

  // ---------- Drops (limited releases) ----------
  async function createDrop(seller: (typeof sellers)[number], name: string, description: string, offsetDays: number, status: "UPCOMING" | "LIVE" | "ENDED") {
    const releaseAt = status === "ENDED" ? daysFromNow(-Math.abs(offsetDays)) : daysFromNow(offsetDays);
    const myProducts = products.filter((p) => p.seller.profile.id === seller.profile.id).slice(0, 3);
    const drop = await prisma.drop.create({
      data: {
        sellerId: seller.profile.id,
        name,
        description,
        coverImage: (myProducts[0]?.product.images as string[] | undefined)?.[0] ?? u(pick([...PHOTOS.craftWorkshop, ...PHOTOS.potteryStudio]), 1000, 1250),
        releaseAt,
        status,
      },
    });
    let order = 0;
    for (const { product } of myProducts) {
      await prisma.dropProduct.create({
        data: { dropId: drop.id, productId: product.id, quantityAvailable: Math.max(1, Math.floor(product.quantity / 2)), order: order++ },
      });
    }
    return drop;
  }

  await createDrop(sellers[0], "Bagong Tahi Capsule", "A small-batch embroidery capsule — 12 pieces, never restocked.", 3, "UPCOMING");
  await createDrop(sellers[4], "Ilocos Collectibles: Regional Set II", "The second regional release of hand-painted jeepney miniatures.", 6, "UPCOMING");
  await createDrop(sellers[5], "Baguio Threads Rainy Season Knits", "Limited highland-dyed knitwear made for the '-ber months.", 10, "UPCOMING");
  await createDrop(sellers[8], "Park Road Vintage: October Estate Finds", "One-off vintage furniture pieces from a single estate haul.", 1, "UPCOMING");
  await createDrop(sellers[10], "Punta Mala Canvas: Bay Series", "Five original Manila Bay paintings, released together, once.", 14, "UPCOMING");

  function sellerByHandle(handle: string) {
    return sellers.find((s) => s.profile.handle === handle)!;
  }
  function sellerIdx(handle: string) {
    return sellers.findIndex((s) => s.profile.handle === handle);
  }
  await createDrop(sellerByHandle("squishandsqueezeph"), "Friday Squishy Drop", "A fresh batch of kawaii squishies — restocks every other Friday.", 2, "UPCOMING");
  await createDrop(sellerByHandle("cardboardkingdomph"), "New Pokémon Singles", "Freshly pulled singles from this week's box breaks.", 4, "UPCOMING");
  await createDrop(sellerByHandle("manilavintageco"), "Sunday Vintage Drop", "One-off vintage pieces sourced from a single estate haul.", 5, "UPCOMING");
  await createDrop(sellerByHandle("madeforyouph"), "Handmade Christmas Drop", "Personalized ornaments and gifts, ready before the -ber months end.", 12, "UPCOMING");
  await createDrop(sellerByHandle("papelattinta"), "Back-to-School Stationery Drop", "Fresh planners and notebooks for the new term.", -2, "ENDED");
  await createDrop(sellerByHandle("otakutambayan"), "Anime Figure Drop", "A small batch of imported figures — first come, first served.", 7, "UPCOMING");

  // ---------- Auctions (standalone marketplace bidding) ----------
  async function makeAuction(entry: (typeof products)[number], opts: { hoursFromNow: number; bidderCount: number; reserve?: boolean; startingBid?: number; minIncrement?: number; buyItNow?: boolean; startsInHours?: number }) {
    const { product } = entry;
    const startingBid = opts.startingBid ?? Math.max(100, Math.round((product.price * 0.4) / 50) * 50);
    const minIncrement = opts.minIncrement ?? 50;
    const reservePrice = opts.reserve ? Math.round((product.price * 0.85) / 50) * 50 : null;
    const buyNowPrice = opts.buyItNow ? Math.round((product.price * 1.3) / 50) * 50 : null;
    const startAt = opts.startsInHours ? hoursFromNow(opts.startsInHours) : undefined;

    await prisma.product.update({
      where: { id: product.id },
      data: { listingType: "AUCTION", sellingModes: ["AUCTION"], quantity: 1, quantityAvailable: 1, price: startingBid },
    });

    const auction = await prisma.productAuction.create({
      data: { productId: product.id, startingBid, reservePrice, buyNowPrice, currentBid: startingBid, minIncrement, startAt, endAt: hoursFromNow(opts.hoursFromNow) },
    });

    if (opts.bidderCount > 0) {
      const bidders = [...allBuyers].sort(() => Math.random() - 0.5).slice(0, opts.bidderCount);
      let current = startingBid;
      for (let i = 0; i < bidders.length; i++) {
        current += minIncrement * (1 + Math.floor(Math.random() * 3));
        await prisma.productBid.create({
          data: { auctionId: auction.id, userId: bidders[i].id, amount: current, createdAt: new Date(Date.now() - (bidders.length - i) * 3600000) },
        });
        await prisma.productEvent.create({ data: { productId: product.id, type: "BID", userId: bidders[i].id, createdAt: new Date(Date.now() - (bidders.length - i) * 3600000) } });
      }
      await prisma.productAuction.update({ where: { id: auction.id }, data: { currentBid: current, bidCount: bidders.length } });
    }
  }

  const auctionCandidates = products.filter((_, i) => i % 13 === 3);
  if (auctionCandidates[0]) await makeAuction(auctionCandidates[0], { hoursFromNow: 3, bidderCount: 7 }); // ending very soon, hot bidding
  if (auctionCandidates[1]) await makeAuction(auctionCandidates[1], { hoursFromNow: 20, bidderCount: 3, buyItNow: true });
  if (auctionCandidates[2]) await makeAuction(auctionCandidates[2], { hoursFromNow: 48, bidderCount: 0 }); // no bids yet
  if (auctionCandidates[3]) await makeAuction(auctionCandidates[3], { hoursFromNow: 6, bidderCount: 4, reserve: true }); // reserve scenario
  if (auctionCandidates[4]) await makeAuction(auctionCandidates[4], { hoursFromNow: 96, bidderCount: 9, buyItNow: true }); // most bids, days out
  if (auctionCandidates[5]) await makeAuction(auctionCandidates[5], { hoursFromNow: -1, bidderCount: 5 }); // already past end — settles on first load

  // Piso start — the Filipino "starts at ₱1" auction format. Small increments
  // so the bid history still feels like a real piso climb.
  const pisoCandidates = products.filter((_, i) => i % 13 === 9);
  if (pisoCandidates[0]) await makeAuction(pisoCandidates[0], { hoursFromNow: 30, bidderCount: 10, startingBid: 1, minIncrement: 5 });
  if (pisoCandidates[1]) await makeAuction(pisoCandidates[1], { hoursFromNow: 8, bidderCount: 6, startingBid: 1, minIncrement: 5 });
  if (pisoCandidates[2]) await makeAuction(pisoCandidates[2], { hoursFromNow: 60, bidderCount: 2, startingBid: 1, minIncrement: 5 }); // fresh piso start, barely any bids yet

  // Rapid auctions — short high-energy windows (well under the 30-minute "rapid" threshold).
  const rapidCandidates = products.filter((_, i) => i % 13 === 12);
  if (rapidCandidates[0]) await makeAuction(rapidCandidates[0], { hoursFromNow: 0.25, bidderCount: 8 }); // ~15 minutes left
  if (rapidCandidates[1]) await makeAuction(rapidCandidates[1], { hoursFromNow: 0.15, bidderCount: 4, startingBid: 1, minIncrement: 5 }); // rapid AND piso — the combo badge

  // Scheduled auctions — sellers can queue one up for later; it surfaces under "Starting Soon" until it opens for bidding.
  const usedForAuctions = new Set([...auctionCandidates, ...pisoCandidates, ...rapidCandidates]);
  const startingSoonCandidates = products.filter((p, i) => i % 19 === 3 && !usedForAuctions.has(p));
  if (startingSoonCandidates[0]) await makeAuction(startingSoonCandidates[0], { startsInHours: 6, hoursFromNow: 6 + 48, bidderCount: 0 });
  if (startingSoonCandidates[1]) await makeAuction(startingSoonCandidates[1], { startsInHours: 30, hoursFromNow: 30 + 72, bidderCount: 0, reserve: true });
  if (startingSoonCandidates[2]) await makeAuction(startingSoonCandidates[2], { startsInHours: 2, hoursFromNow: 2 + 24, bidderCount: 0, startingBid: 1, minIncrement: 5 }); // scheduled piso start

  // ---------- Deals (scheduled discount windows) ----------
  function applyDeal(entry: (typeof products)[number], discountPct: number, startOffsetDays: number | null, endOffsetDays: number | null) {
    const { product } = entry;
    const dealPrice = Math.max(50, Math.round((product.price * (1 - discountPct / 100)) / 10) * 10);
    return prisma.product.update({
      where: { id: product.id },
      data: {
        dealPrice,
        dealStartAt: startOffsetDays !== null ? daysFromNow(startOffsetDays) : null,
        dealEndAt: endOffsetDays !== null ? daysFromNow(endOffsetDays) : null,
      },
    });
  }

  const dealCandidates = products.filter((_, i) => i % 11 === 7 && !auctionCandidates.includes(products[i]));
  if (dealCandidates[0]) await applyDeal(dealCandidates[0], 30, -2, 3); // active now
  if (dealCandidates[1]) await applyDeal(dealCandidates[1], 15, -1, 1); // active, ending soon
  if (dealCandidates[2]) await applyDeal(dealCandidates[2], 20, -5, 10); // active, long window
  if (dealCandidates[3]) await applyDeal(dealCandidates[3], 25, 2, 5); // scheduled — starts in the future
  if (dealCandidates[4]) await applyDeal(dealCandidates[4], 40, -10, -1); // expired — should not appear on /deals
  if (dealCandidates[5]) await applyDeal(dealCandidates[5], 10, -1, 2); // active, small discount

  // ---------- Trending signals ----------
  // Real engagement log so /trending, homepage "Trending Now", and product-card
  // 🔥 badges reflect actual (simulated) recent activity rather than a fake sort.
  function randomTimeWithin(daysAgoMin: number, daysAgoMax: number) {
    const min = daysAgoMin * 86400000;
    const max = daysAgoMax * 86400000;
    return new Date(Date.now() - (min + Math.random() * (max - min)));
  }

  // "Rising fast" — small/newer listings with a concentrated burst of activity
  // in the last 0-3 days, so recent activity clearly exceeds the prior window.
  const risingCandidates = products.filter((_, i) => i % 17 === 5);
  for (const { product } of risingCandidates) {
    const burst = 12 + Math.floor(Math.random() * 18);
    for (let i = 0; i < burst; i++) {
      await prisma.productEvent.create({
        data: { productId: product.id, type: pick(["VIEW", "VIEW", "VIEW", "SAVE", "CART_ADD"]), userId: pick(allBuyers).id, createdAt: randomTimeWithin(0, 3) },
      });
    }
    if (Math.random() < 0.5) {
      await prisma.productEvent.create({ data: { productId: product.id, type: "PURCHASE", userId: pick(allBuyers).id, createdAt: randomTimeWithin(0, 2) } });
    }
  }

  // Flat baseline — spread evenly across the full window, no acceleration.
  // These have real volume but shouldn't out-trend the rising set.
  const flatCandidates = products.filter((_, i) => i % 17 === 11);
  for (const { product } of flatCandidates) {
    const total = 8 + Math.floor(Math.random() * 10);
    for (let i = 0; i < total; i++) {
      await prisma.productEvent.create({
        data: { productId: product.id, type: pick(["VIEW", "VIEW", "SAVE"]), userId: pick(allBuyers).id, createdAt: randomTimeWithin(0, 7) },
      });
    }
  }

  // ---------- Follows ----------
  for (const buyer of allBuyers) {
    const shuffled = [...sellers].sort(() => Math.random() - 0.5);
    const followCount = 2 + Math.floor(Math.random() * 5);
    for (const s of shuffled.slice(0, followCount)) {
      await prisma.follow.create({ data: { followerId: buyer.id, sellerId: s.profile.id } }).catch(() => {});
    }
  }
  for (const s of sellers) {
    const count = await prisma.follow.count({ where: { sellerId: s.profile.id } });
    await prisma.sellerProfile.update({ where: { id: s.profile.id }, data: { followerCount: count } });
  }

  // ---------- Saved products ----------
  for (const buyer of allBuyers) {
    const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, 3 + Math.floor(Math.random() * 5));
    for (const { product } of shuffled) {
      await prisma.savedProduct.create({ data: { userId: buyer.id, productId: product.id } }).catch(() => {});
    }
  }

  // ---------- Orders ----------
  const statuses = ["PAYMENT_PENDING", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED", "CANCELLED"];
  let orderSeq = 1000;
  async function makeOrder(buyer: typeof demoBuyer, seller: (typeof sellers)[number], status: string) {
    const items = [...products.filter((p) => p.seller.profile.id === seller.profile.id)].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
    if (items.length === 0) return null;
    const subtotal = items.reduce((sum, { product }) => sum + product.price, 0);
    const shippingFee = 90;
    const paymentMethod = pick(["GCASH", "MAYA", "QR_PH", "CARD", "ONLINE_BANKING", "COD"]) as
      | "GCASH" | "MAYA" | "QR_PH" | "CARD" | "ONLINE_BANKING" | "COD";
    const order = await prisma.order.create({
      data: {
        orderNumber: `ATBP-${orderSeq++}`,
        buyerId: buyer.id,
        sellerId: seller.profile.id,
        subtotal,
        shippingFee,
        total: subtotal + shippingFee,
        status,
        paymentMethod,
        paymentStatus: status === "PAYMENT_PENDING" ? "PENDING" : status === "CANCELLED" ? "REFUNDED" : "PAID",
        shippingName: buyer.name,
        shippingPhone: buyer.phone ?? "+639171234567",
        shippingAddress: "123 Sample St., Brgy. Malamig",
        shippingCity: "Quezon City",
        shippingProvince: "Metro Manila",
        shippingPostalCode: "1100",
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
        ...(["SHIPPED", "IN_TRANSIT", "DELIVERED", "COMPLETED"].includes(status)
          ? {
              shipment: {
                create: {
                  providerId: "MANUAL",
                  courierName: "J&T Express",
                  trackingNumber: `JT${Math.floor(100000000 + Math.random() * 899999999)}`,
                  status: status === "DELIVERED" || status === "COMPLETED" ? "DELIVERED" : "IN_TRANSIT",
                  shippedAt: new Date(Date.now() - Math.floor(Math.random() * 10) * 86400000),
                  deliveredAt: status === "DELIVERED" || status === "COMPLETED" ? new Date() : null,
                },
              },
            }
          : {}),
        items: {
          create: items.map(({ product }) => ({
            productId: product.id,
            title: product.title,
            imageUrl: (product.images as string[])[0],
            unitPrice: product.price,
            quantity: 1,
            sourceType: "MARKETPLACE",
          })),
        },
        payment: {
          create: {
            provider: "MOCK",
            status: status === "PAYMENT_PENDING" ? "PENDING" : status === "CANCELLED" ? "REFUNDED" : "SUCCEEDED",
            amount: subtotal + shippingFee,
            providerRef: `mock_${Math.random().toString(36).slice(2, 10)}`,
          },
        },
      },
    });
    await recordCommission(order.id, seller.profile.id, subtotal, paymentMethod);
    return order;
  }

  for (const status of statuses) {
    await makeOrder(demoBuyer, pick(sellers), status);
  }
  const juan = sellers[0];
  for (let i = 0; i < 14; i++) {
    await makeOrder(pick(allBuyers), juan, pick(statuses));
  }
  for (let i = 0; i < 40; i++) {
    await makeOrder(pick(allBuyers), pick(sellers), pick(statuses));
  }

  // ---------- Reviews for completed orders ----------
  const completedOrders = await prisma.order.findMany({ where: { status: "COMPLETED" }, include: { items: true } });
  const reviewComments = [
    "Ang ganda ng pagkakagawa, sulit na sulit!", "Exactly as described, will buy again!",
    "Super accommodating ang seller, sagot lahat ng tanong ko.", "Good quality, packed securely.",
    "Love the story behind this piece, hindi lang basta bili.", "Ang bait ng seller, ang bilis pa ng delivery!",
  ];
  for (const order of completedOrders) {
    const reviewedItem = pick(order.items);
    const product = reviewedItem ? await prisma.product.findUnique({ where: { id: reviewedItem.productId } }) : null;
    const productImages = (product?.images as string[] | undefined) ?? [];
    const photos = Math.random() < 0.35 && productImages.length > 1 ? productImages.slice(1, 1 + Math.ceil(Math.random() * 2)) : [];

    await prisma.review.create({
      data: {
        orderId: order.id,
        sellerId: order.sellerId,
        productId: reviewedItem?.productId,
        buyerId: order.buyerId!, // seed never creates guest (buyerId-less) orders
        rating: 4 + Math.round(Math.random()),
        comment: pick(reviewComments),
        photos,
      },
    }).catch(() => {});
  }

  // ---------- Notifications for demo buyer ----------
  const notifDefs = [
    { type: "DROP_REMINDER", title: "Bagong Tahi Capsule drops soon", body: "Tahi-Tahi Studio's limited capsule releases in 3 days.", linkUrl: "/drops" },
    { type: "ORDER_SHIPPED", title: "Order shipped", body: "Your order ATBP-1002 is on its way via J&T Express.", linkUrl: "/orders" },
    { type: "NEW_FOLLOWER", title: "New follower", body: "Kevin Tan started following you.", linkUrl: "/profile" },
    { type: "ORDER_DELIVERED", title: "Order delivered", body: "Your order ATBP-1004 has been delivered.", linkUrl: "/orders" },
    { type: "SELLER_NEW_PRODUCT", title: "New from a seller you follow", body: "Luzon Clay Works just listed a new ceramic vase.", linkUrl: "/discover" },
  ];
  for (const n of notifDefs) {
    await prisma.notification.create({
      data: { userId: demoBuyer.id, ...n, read: Math.random() < 0.4, createdAt: new Date(Date.now() - Math.random() * 5 * 86400000) },
    });
  }

  // ---------- Message threads ----------
  const thread = await prisma.messageThread.create({
    data: { buyerId: demoBuyer.id, sellerId: juan.profile.id },
  });
  await prisma.message.createMany({
    data: [
      { threadId: thread.id, senderId: demoBuyer.id, body: "Hi! Is the coin pouch still available in green?", createdAt: new Date(Date.now() - 3600000) },
      { threadId: thread.id, senderId: juan.user.id, body: "Yes po! Available pa. Gagawin ko within 2 days after order.", createdAt: new Date(Date.now() - 3500000) },
      { threadId: thread.id, senderId: demoBuyer.id, body: "Perfect, order na po ako. Thank you!", createdAt: new Date(Date.now() - 3400000) },
    ],
  });

  // ---------- Reports & disputes (for admin) ----------
  await prisma.report.create({
    data: {
      reporterId: pick(buyers).id,
      targetType: "PRODUCT",
      productId: pick(products).product.id,
      targetLabel: "Suspicious listing description",
      reason: "Possible misrepresentation",
      details: "Listing says handmade but photos look mass-produced.",
      status: "OPEN",
    },
  });
  await prisma.report.create({
    data: {
      reporterId: pick(buyers).id,
      targetType: "SELLER",
      targetLabel: oneApplicantUser.username,
      reason: "Spam messages",
      details: "Seller kept sending unsolicited promo messages.",
      status: "OPEN",
    },
  });

  const disputeOrder = completedOrders[0];
  if (disputeOrder) {
    await prisma.dispute.create({
      data: {
        orderId: disputeOrder.id,
        raisedById: disputeOrder.buyerId,
        reason: "Item not as described",
        details: "Received item's condition looked more worn than the listing photos showed.",
        status: "OPEN",
      },
    });
    await prisma.order.update({ where: { id: disputeOrder.id }, data: { status: "DISPUTED" } });
  }

  // ---------- Payouts ----------
  for (const s of sellers.slice(0, 6)) {
    await prisma.payout.create({
      data: {
        sellerId: s.profile.id,
        amount: pesoRandom(2000, 25000, 100),
        status: pick(["PENDING", "PAID", "PAID", "PROCESSING"]),
        method: pick(["GCASH", "MAYA", "BANK"]),
        destination: "•••• " + Math.floor(1000 + Math.random() * 8999),
        requestedAt: new Date(Date.now() - Math.random() * 15 * 86400000),
        processedAt: Math.random() < 0.6 ? new Date() : null,
      },
    });
  }

  // ---------- Promo codes ----------
  await prisma.promoCode.create({
    data: { sellerId: sellers[0].profile.id, code: "WELCOME10", discountType: "PERCENT", discountValue: 10, perUserLimit: 1 },
  });
  await prisma.promoCode.create({
    data: { sellerId: sellers[0].profile.id, code: "SUKI50", discountType: "FIXED", discountValue: 50, minSubtotal: 500, perUserLimit: 3, maxRedemptions: 100 },
  });
  await prisma.promoCode.create({
    data: { sellerId: sellers[1].profile.id, code: "CLOSET20", discountType: "PERCENT", discountValue: 20, minSubtotal: 1000, perUserLimit: 1, expiresAt: daysFromNow(14) },
  });

  // ---------- ATBP Picks & seasonal collections (admin-manageable) ----------
  async function createPick(slug: string, title: string, subtitle: string, emoji: string, type: string, opts: { tags?: string[]; handles?: string[]; limit?: number }) {
    const collection = await prisma.collection.create({ data: { slug, title, subtitle, emoji, type, order: 0 } });
    if (opts.tags?.length) {
      const matches = await prisma.product.findMany({
        where: { status: "ACTIVE", OR: opts.tags.map((tag) => ({ tags: { array_contains: tag } })) },
        take: opts.limit ?? 12,
        orderBy: { likeCount: "desc" },
      });
      await prisma.collectionProduct.createMany({
        data: matches.map((p, i) => ({ collectionId: collection.id, productId: p.id, order: i })),
      });
    }
    if (opts.handles?.length) {
      await prisma.collectionSeller.createMany({
        data: opts.handles
          .map((h) => sellers.find((s) => s.profile.handle === h))
          .filter((s): s is (typeof sellers)[number] => !!s)
          .map((s, i) => ({ collectionId: collection.id, sellerId: s.profile.id, order: i })),
      });
    }
    return collection;
  }

  await createPick("filipino-finds-under-500", "10 Filipino Finds Under ₱500", "Local finds that won't break the bank", "🇵🇭", "PICK", { tags: ["filipino-finds", "under-500"], limit: 10 });
  await createPick("gifts-that-dont-feel-generic", "12 Gifts That Don't Feel Generic", "Thoughtful picks for people who have everything", "🎁", "PICK", { tags: ["gifts", "personalized"], limit: 12 });
  await createPick("shops-worth-checking-out", "10 Shops Worth Checking Out", "Small shops our team keeps coming back to", "🏪", "SHOPS", {
    handles: ["tahitahistudio", "likhastudio", "guhitstudio", "cardboardkingdomph", "squishandsqueezeph", "manilavintageco", "habinglokal", "amihanbeauty", "kalikasanleather", "otakutambayan"],
  });
  await createPick("cool-finds-for-collectors", "8 Cool Finds for Collectors", "Pokémon, figures, and vinyl worth the hunt", "🗂️", "PICK", { tags: ["for-collectors", "pokemon"], limit: 8 });
  await createPick("handmade-gifts-you-can-personalize", "10 Handmade Gifts You Can Personalize", "Add a name, a date, or a little something extra", "✨", "PICK", { tags: ["personalized", "handmade-finds"], limit: 10 });
  await createPick("vintage-finds-this-week", "10 Vintage Finds We Found This Week", "Estate sales, ukay racks, and one-off pieces", "🕰️", "PICK", { tags: ["vintage-finds"], limit: 10 });

  // Seasonal — admin can toggle these active/inactive without a redeploy.
  await createPick("christmas-gifts-2026", "Christmas Gifts", "'Tis the season — gift ideas for everyone on your list", "🎄", "SEASONAL", { tags: ["christmas-gifts", "gifts"], limit: 10 });
  await createPick("graduation-season-2026", "Graduation Season", "Send them off right", "🎓", "SEASONAL", { tags: ["graduation-gifts"], limit: 8 });
  await createPick("wedding-season-2026", "Wedding Season Finds", "Gifts and finds for the wedding season", "💍", "SEASONAL", { tags: ["wedding-gifts"], limit: 8 });

  // ---------- Founding sellers ----------
  for (const handle of ["tahitahistudio", "manilaclosetarchive"]) {
    const seller = sellers.find((s) => s.profile.handle === handle);
    if (seller) {
      const current = seller.profile.badges as string[];
      if (!current.includes("FOUNDING_SELLER")) {
        await prisma.sellerProfile.update({ where: { id: seller.profile.id }, data: { badges: [...current, "FOUNDING_SELLER"] } });
      }
    }
  }

  // ---------- Made-to-Order backfill ----------
  // CUSTOM-type products were always conceptually made-to-order; make that explicit
  // as a structured attribute rather than leaving it implied by the type field alone.
  await prisma.product.updateMany({
    where: { type: "CUSTOM" },
    data: {
      madeToOrder: true,
      productionTimeDays: 5,
      customizationOptions: ["Color", "Size", "Text / Name"],
      personalizationInstructions: "Add your requested text, color, or size in the order notes after checkout — the seller will follow up to confirm details.",
    },
  });

  // ---------- Digital Download demo products ----------
  const guhit = sellers.find((s) => s.profile.handle === "guhitstudio");
  if (guhit) {
    await prisma.product.create({
      data: {
        sellerId: guhit.profile.id,
        categoryId: catBySlug.art.id,
        title: "Digital Art Print Pack (High-Res Files)",
        description: "Five original illustrations as print-ready digital files — no shipping, download instantly after purchase.",
        images: photos(PHOTOS.miniCanvas),
        price: 150,
        quantity: 999,
        quantityAvailable: 999,
        type: "ART",
        condition: "BRAND_NEW",
        status: "ACTIVE",
        sellingModes: ["BUY_NOW"],
        shippingAvailable: false,
        isDigital: true,
        digitalFileUrl: "https://example.com/downloads/guhit-print-pack.zip",
        digitalDeliveryInstructions: "Your download link will be available on your order page once payment is confirmed. Files are high-res JPEG, ready for home printing.",
        likeCount: 34,
        viewCount: 410,
        tags: autoTags({ type: "ART", categorySlug: "art", price: 150 }),
        createdAt: new Date(Date.now() - 10 * 86400000),
      },
    });
    await prisma.product.create({
      data: {
        sellerId: guhit.profile.id,
        categoryId: catBySlug.custom.id,
        title: "Custom Digital Portrait Commission (JPEG File)",
        description: "A personalized illustrated portrait from your photo, delivered as a high-res digital file — perfect for printing yourself or sharing online.",
        images: photos(PHOTOS.inkPortrait),
        price: 650,
        quantity: 999,
        quantityAvailable: 999,
        type: "CUSTOM",
        condition: "BRAND_NEW",
        status: "ACTIVE",
        sellingModes: ["BUY_NOW"],
        shippingAvailable: false,
        isDigital: true,
        madeToOrder: true,
        productionTimeDays: 7,
        customizationOptions: ["Reference photo", "Style (realistic / stylized)", "Background color"],
        personalizationInstructions: "Upload your reference photo and preferred style after checkout — a link will be sent for you to share it.",
        digitalDeliveryInstructions: "Delivered as a high-res JPEG once complete, usually within a week — check your order page for the download link.",
        likeCount: 58,
        viewCount: 620,
        tags: autoTags({ type: "CUSTOM", categorySlug: "custom", price: 650 }),
        createdAt: new Date(Date.now() - 4 * 86400000),
      },
    });
  }

  // ---------- Discovery-tag backfill (hidden-gems, rare-finds, tiktok-finds) ----------
  // Data-driven, not hand-picked: each tag is applied based on the product's own
  // real attributes/signals, so "Hidden Gems" etc. stay honest dynamic collections.
  const hiddenGemCandidates = await prisma.product.findMany({
    where: { status: "ACTIVE", viewCount: { lt: 400 } },
    orderBy: { likeCount: "desc" },
    take: 30,
  });
  for (const p of hiddenGemCandidates) {
    const tags = new Set(p.tags as string[]);
    tags.add("hidden-gems");
    await prisma.product.update({ where: { id: p.id }, data: { tags: [...tags] } });
  }

  const rareFindCandidates = await prisma.product.findMany({
    where: { status: "ACTIVE", type: "COLLECTIBLE", price: { gte: 1500 } },
    take: 30,
  });
  for (const p of rareFindCandidates) {
    const tags = new Set(p.tags as string[]);
    tags.add("rare-finds");
    await prisma.product.update({ where: { id: p.id }, data: { tags: [...tags] } });
  }

  const tiktokFindCandidates = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { tags: { array_contains: "cute-finds" } },
        { tags: { array_contains: "sanrio" } },
        { tags: { array_contains: "k-pop" } },
        { tags: { array_contains: "anime" } },
      ],
    },
    take: 40,
  });
  for (const p of tiktokFindCandidates) {
    const tags = new Set(p.tags as string[]);
    tags.add("tiktok-finds");
    await prisma.product.update({ where: { id: p.id }, data: { tags: [...tags] } });
  }

  // ---------- My Closet / My Yard Sale demo content ----------
  // Dedicated casual-seller accounts (unverified, sellerKind INDIVIDUAL) so
  // Discover's Closet/Yard Sale sections and /admin/closets have real content
  // to show instead of empty states. Items are created the same shape the
  // quick-list flow produces, with a proper title/description filled in
  // afterward — same as a real seller would do from the item's own page.
  interface ClosetItemSeed {
    title: string;
    description: string;
    categorySlug: string;
    condition: "BRAND_NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
    price: number;
    photo: string;
  }

  async function seedClosetSeller(opts: {
    email: string;
    name: string;
    username: string;
    shopName: string;
    closetTitle: string;
    handle: string;
    province: string;
    description: string;
    featured: boolean;
    items: ClosetItemSeed[];
  }) {
    const user = await prisma.user.create({
      data: {
        email: opts.email, passwordHash, name: opts.name, username: opts.username,
        avatarUrl: avatar(opts.username), role: "SELLER",
        phone: "+639" + Math.floor(100000000 + Math.random() * 899999999),
        bio: opts.description,
      },
    });
    await prisma.cart.create({ data: { userId: user.id } });
    const seller = await prisma.sellerProfile.create({
      data: {
        userId: user.id, shopName: opts.shopName, handle: opts.handle, description: opts.description,
        logoUrl: avatar(opts.username), status: "APPROVED", sellerKind: "INDIVIDUAL",
        rating: 4.3 + Math.random() * 0.6, ratingCount: Math.floor(5 + Math.random() * 60),
        totalSales: Math.floor(10 + Math.random() * 150), province: opts.province,
        primaryCategories: ["pre-loved", "fashion"],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 120) * 86400000),
      },
    });
    const closet = await prisma.closet.create({
      data: { sellerId: seller.id, title: opts.closetTitle, city: opts.province, description: opts.description, featured: opts.featured },
    });
    for (const item of opts.items) {
      await prisma.product.create({
        data: {
          sellerId: seller.id, categoryId: catBySlug[item.categorySlug].id, title: item.title, description: item.description,
          images: [u(item.photo)], price: item.price, quantity: 1, quantityAvailable: 1, type: "PRE_LOVED",
          condition: item.condition, sellingModes: ["BUY_NOW"], listingType: "FIXED", status: "ACTIVE",
          shippingAvailable: true, pickupAvailable: true, closetId: closet.id, closetConfirmedAt: new Date(),
          tags: autoTags({ type: "PRE_LOVED", categorySlug: item.categorySlug, price: item.price }),
        },
      });
    }
    return { user, seller, closet };
  }

  await seedClosetSeller({
    email: "closet.iris@demo.atbp", name: "Iris Fernandez", username: "irisscloset",
    shopName: "Iris's Closet", closetTitle: "Iris's Closet", handle: "irisscloset", province: "Quezon City",
    description: "Pre-loved women's fashion from my own closet — inspected, laundered, and honestly photographed. Bundle 3+ items for a discount, just message me.",
    featured: true,
    items: [
      { title: "Zara Wool-Blend Trench Coat (S)", description: "Worn a handful of times, no pilling. Camel colorway, ties at the waist.", categorySlug: "fashion", condition: "LIKE_NEW", price: 950, photo: pick(PHOTOS.trenchCoat) },
      { title: "Levi's 501 Denim Jacket (M)", description: "Classic light-wash trucker jacket, some natural fading at the cuffs.", categorySlug: "fashion", condition: "GOOD", price: 780, photo: pick(PHOTOS.denimJacket) },
      { title: "Coach Leather Loafers (Size 7)", description: "Genuine leather, resoled once by a local cobbler — still has a lot of life left.", categorySlug: "fashion", condition: "GOOD", price: 1150, photo: pick(PHOTOS.loafers) },
      { title: "Vintage Barong-Inspired Blouse (M)", description: "Piña-blend fabric, hand-embroidered neckline. A closet favorite, letting go since it no longer fits.", categorySlug: "pre-loved", condition: "LIKE_NEW", price: 620, photo: pick(PHOTOS.barong) },
      { title: "Canvas Tote Bag Bundle (x2)", description: "Two everyday totes, light wear on the base. Selling as a pair.", categorySlug: "bags", condition: "GOOD", price: 340, photo: pick(PHOTOS.toteBag) },
    ],
  });

  await seedClosetSeller({
    email: "closet.marco@demo.atbp", name: "Marco Villaruel", username: "marcoscloset",
    shopName: "Marco's Vintage Finds", closetTitle: "Marco's Closet", handle: "marcoscloset", province: "Cebu City",
    description: "Thrifted and hand-me-down streetwear pieces I've outgrown or don't wear anymore. Cebu-based, meet-ups possible.",
    featured: false,
    items: [
      { title: "Vintage Denim Jacket, Oversized Fit", description: "Boxy fit, slightly distressed collar — that's the charm, not damage.", categorySlug: "streetwear", condition: "GOOD", price: 690, photo: pick(PHOTOS.denimJacket) },
      { title: "Leather Loafers, Brown (Size 9)", description: "A couple of scuffs on the toe, otherwise solid. Real leather sole.", categorySlug: "fashion", condition: "FAIR", price: 480, photo: pick(PHOTOS.loafers) },
      { title: "Wool Trench Coat, Charcoal (L)", description: "Barely worn — bought during a cold Baguio trip, doesn't get much use in Cebu.", categorySlug: "vintage", condition: "LIKE_NEW", price: 1050, photo: pick(PHOTOS.trenchCoat) },
      { title: "Canvas Weekender Tote", description: "Sturdy canvas, one small ink mark on the inside lining (not visible from outside).", categorySlug: "bags", condition: "GOOD", price: 290, photo: pick(PHOTOS.toteBag) },
    ],
  });

  interface YardSaleItemSeed {
    title: string;
    description: string;
    categorySlug: string;
    condition: "BRAND_NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
    price: number;
    photo: string;
  }

  async function seedYardSaleSeller(opts: {
    email: string;
    name: string;
    username: string;
    shopName: string;
    handle: string;
    province: string;
    description: string;
    saleTitle: string;
    startInDays: number;
    endInDays: number;
    items: YardSaleItemSeed[];
  }) {
    const user = await prisma.user.create({
      data: {
        email: opts.email, passwordHash, name: opts.name, username: opts.username,
        avatarUrl: avatar(opts.username), role: "SELLER",
        phone: "+639" + Math.floor(100000000 + Math.random() * 899999999),
        bio: opts.description,
      },
    });
    await prisma.cart.create({ data: { userId: user.id } });
    const seller = await prisma.sellerProfile.create({
      data: {
        userId: user.id, shopName: opts.shopName, handle: opts.handle, description: opts.description,
        logoUrl: avatar(opts.username), status: "APPROVED", sellerKind: "INDIVIDUAL",
        rating: 4.2 + Math.random() * 0.6, ratingCount: Math.floor(2 + Math.random() * 20),
        totalSales: Math.floor(2 + Math.random() * 30), province: opts.province,
        primaryCategories: ["home-living", "hobby-toys"],
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
      },
    });
    const yardSale = await prisma.yardSale.create({
      data: {
        sellerId: seller.id, title: opts.saleTitle, city: opts.province, description: opts.description,
        startDate: daysFromNow(opts.startInDays), endDate: daysFromNow(opts.endInDays), status: "ACTIVE",
      },
    });
    for (const item of opts.items) {
      await prisma.product.create({
        data: {
          sellerId: seller.id, categoryId: catBySlug[item.categorySlug].id, title: item.title, description: item.description,
          images: [u(item.photo)], price: item.price, quantity: 1, quantityAvailable: 1, type: "PRE_LOVED",
          condition: item.condition, sellingModes: ["BUY_NOW"], listingType: "FIXED", status: "ACTIVE",
          shippingAvailable: true, pickupAvailable: true, yardSaleId: yardSale.id,
          tags: autoTags({ type: "PRE_LOVED", categorySlug: item.categorySlug, price: item.price }),
        },
      });
    }
    return { user, seller, yardSale };
  }

  await seedYardSaleSeller({
    email: "yardsale.delacruz@demo.atbp", name: "Ben Dela Cruz", username: "delacruzyardsale",
    shopName: "The Dela Cruz Family Yard Sale", handle: "delacruzyardsale", province: "Taguig City",
    description: "Clearing out the garage before we move — furniture, books, and toys the kids have outgrown. Everything must go!",
    saleTitle: "Dela Cruz Moving-Out Sale", startInDays: -3, endInDays: 10,
    items: [
      { title: "Rattan Accent Chair", description: "Sturdy, minor wear on the armrest weave. Great for a reading corner.", categorySlug: "home-living", condition: "GOOD", price: 1800, photo: pick(PHOTOS.vintageChair) },
      { title: "Mini Bar Cart on Wheels", description: "Two-tier, casters roll smoothly. A little dust but structurally solid.", categorySlug: "home-living", condition: "GOOD", price: 1450, photo: pick(PHOTOS.barCart) },
      { title: "Box of Assorted Paperbacks (15 books)", description: "Mixed fiction and non-fiction, mostly good condition — a few with creased spines.", categorySlug: "books", condition: "GOOD", price: 350, photo: pick(PHOTOS.comicBooks) },
      { title: "Kids' Diecast Car Collection (12 pcs)", description: "Outgrown by our youngest — a mix of scales, no missing parts.", categorySlug: "hobby-toys", condition: "GOOD", price: 550, photo: pick(PHOTOS.diecast) },
      { title: "Ceramic Serving Bowls, Set of 4", description: "Barely used wedding gift set — we ended up with duplicates.", categorySlug: "home-living", condition: "LIKE_NEW", price: 620, photo: pick(PHOTOS.ceramicBowls) },
      { title: "Manual Sewing Machine, Working Condition", description: "Old but reliable — tested and stitches cleanly. No case included.", categorySlug: "home-living", condition: "FAIR", price: 2200, photo: pick(PHOTOS.sewingMachine) },
    ],
  });

  await seedYardSaleSeller({
    email: "yardsale.santos@demo.atbp", name: "Cathy Santos", username: "santosgaragesale",
    shopName: "Santos Garage Sale", handle: "santosgaragesale", province: "Davao City",
    description: "One-weekend garage sale — collectibles and home decor from a recent apartment declutter.",
    saleTitle: "Santos Weekend Declutter", startInDays: -1, endInDays: 1.5,
    items: [
      { title: "Vintage Enamel Storage Canisters, Set of 3", description: "Retro-style kitchen canisters, light surface wear, no rust inside.", categorySlug: "home-living", condition: "GOOD", price: 480, photo: pick(PHOTOS.enamelCanisters) },
      { title: "Carved Wooden Figure, Tabletop Size", description: "Handcarved souvenir piece, small chip on the base you won't notice once displayed.", categorySlug: "collectibles", condition: "FAIR", price: 320, photo: pick(PHOTOS.carvedFigure) },
      { title: "Trading Card Binder (80+ cards)", description: "Mixed sports and hobby cards in sleeves, collected over a few years.", categorySlug: "trading-cards", condition: "GOOD", price: 750, photo: pick(PHOTOS.tradingCards) },
      { title: "Capiz Shell Pendant Lamp", description: "Working condition, a couple of shell panels have hairline cracks (not visible when lit).", categorySlug: "home-living", condition: "GOOD", price: 890, photo: pick(PHOTOS.capizLamp) },
    ],
  });

  console.log("Seed complete.");
  console.log("Demo logins (password: demo1234):");
  console.log("  Buyer:  buyer@demo.atbp");
  console.log("  Seller: seller@demo.atbp  (Tahi-Tahi Studio)");
  console.log("  Admin:  admin@demo.atbp");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
