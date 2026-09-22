// Phase "Marketplace Density" — a large batch of additional demo sellers and
// products, layered on top of the original seed.ts sellers. Kept in its own
// file because of sheer size; seed.ts imports and merges this in.
//
// This is explicitly seed/demo data for development and testing — the shops
// and people described here are fictional.

function u(id: string, w = 900, h = 900) {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
}
function photos(ids: string[], w = 900, h = 900) {
  return ids.map((id) => u(id, w, h));
}
function avatar(seed: string) {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`;
}

export interface NewProductDef {
  title: string;
  desc: string;
  price: number;
  compareAtPrice?: number;
  type: string;
  condition?: string;
  images: string[];
  tags?: string[];
  categorySlug?: string; // overrides the seller's default category for this one product
  food?: {
    shelfStable?: boolean;
    expiryInfo?: string;
    ingredients?: string;
    allergens?: string;
    foodShippingNotes?: string;
  };
}

export interface NewSellerDef {
  email: string;
  name: string;
  username: string;
  shopName: string;
  handle: string;
  category: string;
  description: string;
  story: string;
  province: string;
  tier: "NEW" | "TRUSTED" | "ESTABLISHED" | "TOP";
  physicalPresence?: string;
  pickupAvailable?: boolean;
  products: NewProductDef[];
}

export const NEW_CATEGORIES = [
  { name: "Gaming", slug: "gaming", icon: "🎮" },
  { name: "Trading Cards", slug: "trading-cards", icon: "🎴" },
  { name: "Anime & Manga", slug: "anime", icon: "🌸" },
  { name: "Books", slug: "books", icon: "📚" },
  // Named distinctly from its parent group ("Automotive & Outdoor") — see
  // the same note in prisma/seed.ts for Filipino Finds/Fashion/Home & Living.
  { name: "Auto Parts & Accessories", slug: "automotive", icon: "🏍️" },
  { name: "Beauty", slug: "beauty", icon: "💄" },
  { name: "Jewelry", slug: "jewelry", icon: "💎" },
  { name: "Plants", slug: "plants", icon: "🪴" },
  { name: "Stationery", slug: "stationery", icon: "📔" },
  { name: "Music & Vinyl", slug: "music", icon: "🎵" },
  { name: "Tech Accessories", slug: "tech", icon: "📱" },
  { name: "Baby & Kids", slug: "baby-kids", icon: "👶" },
  { name: "Pet Supplies", slug: "pets", icon: "🐾" },
  { name: "Bags & Leather", slug: "bags", icon: "👜" },
  { name: "Filipino Delicacies", slug: "food-snacks", icon: "🍪" },
  { name: "Party & Wedding", slug: "party-wedding", icon: "🎉" },
  { name: "Streetwear", slug: "streetwear", icon: "🧢" },
  { name: "Outdoor & Camping", slug: "outdoor", icon: "🏕️" },
];

const PH = {
  squishy: photos(["1764590212225-b05ea6747046", "1643014940388-0ca9cb03c525", "1763905145495-6e7d3f9b22a4", "1669995373446-ff424428002d"]),
  gameController: photos(["1585881728919-5c0ce925ad10", "1602029908656-b54d40a76ad8", "1610561212775-b191f21b6998", "1754456739790-c5e55badd2d0"]),
  pokemonCards: photos(["1613771404784-3a5686aa2be3", "1647892591880-58c55fd726d8", "1616196334218-caffdc9b2317", "1703023689733-6a4281149189", "1636391671086-6b4b776cd031"]),
  lipBalm: photos(["1672883435480-81b9f385654e", "1638404431939-3943201c8a86", "1768983283321-8da0a5bed822"]),
  animeFigure: photos(["1621478374422-35206faeddfb", "1623252729328-9941b271ad48", "1765633358993-c8a68fd47d6f", "1670834169539-feed72d15b25"]),
  booksStack: photos(["1529590003495-b2646e2718bf", "1613577553731-e102e5de62f5", "1585521549926-ca6526bda09e", "1570676765227-b25aa08d9752"]),
  toyFigure: photos(["1780726624500-8de106966b6f", "1762786621846-61b378f17620", "1785068006036-b2d8460dbe34"]),
  motorcycleGear: photos(["1590506995460-d0d9892b54da", "1591216105236-5ba45970702a", "1575312363468-c8455fb38a76"]),
  sneakers: photos(["1560769629-975ec94e6a86", "1633464129147-777bdcc97c1d", "1495555961986-6d4c1ecb7be3", "1698108223703-0af88bee1104"]),
  streetwear: photos(["1564557287817-3785e38ec1f5", "1598539962077-e4185f37104f", "1740381918234-d364ff4c5cb4"]),
  plants: photos(["1459156212016-c812468e2115", "1485955900006-10f4d324d411", "1550207477-85f418dc3448"]),
  stationery: photos(["1591195852468-03a01d1375d6", "1654542645651-5196f4931cd6", "1620287920810-3f5b9746380c"]),
  vinylRecords: photos(["1582730147924-d92f4da00252", "1483412033650-1015ddeb83d1", "1587731556938-38755b4803a6"]),
  funko: photos(["1623295783032-6af0e569659e", "1561409106-fece1abb71cb", "1663387124951-ff3eade18de5"]),
  sanrio: photos(["1702949899719-708333d76fbd", "1764344814867-d7a6916e1a37"]),
  babyKnit: photos(["1638081630277-bfe0ceef6601", "1611884149911-1cde27a442fe"]),
  crochet: photos(["1761439099134-e64b1e803135", "1691764543504-bafacbe9ea1b"]),
  petAccessories: photos(["1583337130417-3346a1be7dee", "1598133894008-61f7fdb8cc3a", "1627915009986-6639e924b297"]),
  leatherBag: photos(["1473188588951-666fce8e7c68", "1637759292654-a12cb2be085e", "1517612228538-cefdbc2c01e7"]),
  weddingParty: photos(["1751257567128-a90534b263e6", "1660243353150-fc16ed9881e5", "1673555363891-a514a04fb91f"]),
  coffeeBeans: photos(["1524350876685-274059332603", "1562051036-e0eea191d42f", "1595950411750-1323532fe72e"]),
  kpopMerch: photos(["1719241374171-a37e7b95fdc1", "1616777103777-d11788eb26eb", "1637910116483-7efcc9480847"]),
  phoneAccessories: photos(["1535157412991-2ef801c1748b", "1620786963525-4a74f1697a46", "1593298204880-46a17ccad7b0"]),
  pinSticker: photos(["1621252756235-7f37e5e5125e", "1754677701203-23b7eb7497d3", "1628013822849-0b4188bfb027"]),
  basketballJersey: photos(["1580089595767-98745d7025c5", "1551479460-5e76c686816a", "1710945261882-a94b3f31b15e"]),
  campingGear: photos(["1504280390367-361c6d9f38f4", "1510312305653-8ed496efae75", "1625834509314-3b12c6153624"]),
  rcModel: photos(["1717645730191-b0e2d1962a2b", "1640520938916-e93cbb2fc710", "1653070284385-c656d719791b"]),
  fishingGear: photos(["1529230117010-b6c436154f25", "1551131618-3f0a5cf594b4", "1619054976487-7198b8924922"]),
  antiqueShop: photos(["1560697043-f880bb028f1e", "1763336319612-43ee4e9396d5", "1784022163252-ac0990893e06"]),
  ceramicMug: photos(["1666445844615-0a3930270f13", "1590422749897-47036da0b0ff"]),
  ceramicBowls: photos(["1577576223085-3eb295cd414f", "1530006498959-b7884e829a04"]),
  carvedFigure: photos(["1618523748986-e95e741e6537", "1786684937744-cae47a930366"]),
  coconutCandle: photos(["1592907677605-d42ffee99d05", "1756447647171-0022624cf35f"]),
  vintageCamera: photos(["1510127034890-ba27508e9f1c", "1516961642265-531546e84af2", "1603208234872-619ffa1209cb"]),
  toteBag: photos(["1598532163257-ae3c6b2524b6", "1588122698107-836d3c39704c"]),
  denimJacket: photos(["1611312449408-fcece27cdbb7", "1555583743-991174c11425"]),
  trenchCoat: photos(["1539533113208-f6df8cc8b543", "1539533018447-63fcce2678e3"]),
  silverCuff: photos(["1728646998199-127b357a464d", "1728646996588-9ae7ef3c9633"]),
  pendant: photos(["1589128777073-263566ae5e4d", "1588444837495-c6cfeb53f32d"]),
  resinKeychain: photos(["1687363714985-990685339050", "1618212542687-93ac846f43c3"]),
  resinOrnament: photos(["1788051115771-0d8d840476ff", "1766157433529-9ce21b6c1e09"]),
  miniCanvas: photos(["1568448705245-1250489bcd66", "1691849721970-e2e3ba443ed7"]),
  seascapePainting: photos(["1690850855189-28de3097586a", "1784296868264-23398694802c"]),
  rattanTray: photos(["1754573433915-2a68e3b339b0", "1747889682883-5b41a4b915ae"]),
  wallHanging: photos(["1567696154083-9547fd0c8e1d", "1776721977064-d4e5389db6b9"]),
};

export const NEW_SELLERS: NewSellerDef[] = [
  // ---------- 1. Squishies / Plush ----------
  {
    email: "squish@demo.atbp", name: "Rina Domingo", username: "squishandsqueezeph",
    shopName: "Squish & Squeeze PH", handle: "squishandsqueezeph", category: "hobby-toys",
    description: "Squishies, plush, and kawaii desk toys — soft things that make your day better.",
    story: "Started as a small squishy collection I couldn't stop growing. Now I share the joy with fellow squish addicts.",
    province: "Quezon City", tier: "TOP", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Kawaii Cat Squishy", desc: "Slow-rise scented squishy, soft and pillowy.", price: 180, type: "COLLECTIBLE", images: PH.squishy, tags: ["cute-finds", "toys-plush", "gifts-for-kids"] },
      { title: "Bread Loaf Mini Squishy Set (3pc)", desc: "Adorable bread-shaped squishies, great party favors.", price: 250, type: "COLLECTIBLE", images: PH.squishy, tags: ["cute-finds", "toys-plush"] },
      { title: "Jumbo Sanrio-Style Bunny Plush", desc: "16-inch soft plush bunny, huggable and squishy.", price: 650, type: "COLLECTIBLE", images: PH.squishy, tags: ["gifts-for-kids", "cute-finds", "toys-plush", "sanrio"] },
      { title: "Mystery Squishy Grab Bag", desc: "Surprise pack of 3 random squishies — you don't know what you get!", price: 320, type: "COLLECTIBLE", images: PH.squishy, tags: ["cute-finds", "toys-plush", "under-500"] },
      { title: "Keychain Squishy Charm Pack", desc: "Set of 4 mini squishy keychains, clip-on ring included.", price: 220, type: "COLLECTIBLE", images: PH.squishy, tags: ["gifts-for-kids", "toys-plush", "under-250"] },
      { title: "Kawaii Desk Toy Duo", desc: "Two stress-relief squishy toys for your work desk.", price: 280, type: "COLLECTIBLE", images: PH.squishy, tags: ["cute-finds", "toys-plush", "under-500"] },
      { title: "Food-Shaped Squishy Bundle (5pc)", desc: "Donut, sushi, dumpling, and more — squishy food set.", price: 480, type: "COLLECTIBLE", images: PH.squishy, tags: ["gifts-for-kids", "toys-plush"] },
      { title: "Giant Panda Plush Pillow", desc: "Extra-large panda plush, doubles as a pillow.", price: 890, type: "COLLECTIBLE", images: PH.squishy, tags: ["gifts-for-kids", "cute-finds", "toys-plush"] },
      { title: "Scented Strawberry Squishy", desc: "Fruity-scented slow-rise squishy, TPR material.", price: 150, type: "COLLECTIBLE", images: PH.squishy, tags: ["under-250", "toys-plush"] },
      { title: "Cartoon Animal Figurine Set (6pc)", desc: "Cute cartoon animal figures for desk display.", price: 380, type: "COLLECTIBLE", images: PH.squishy, tags: ["toys-plush"] },
      { title: "Blind Box Squishy Series 2", desc: "Sealed blind box — collect the full set of 8 designs.", price: 199, type: "COLLECTIBLE", images: PH.squishy, tags: ["under-250", "toys-plush"] },
      { title: "Squishy Starter Bundle (10pc)", desc: "Beginner's collection bundle — great gift for kids.", price: 990, type: "COLLECTIBLE", images: PH.squishy, tags: ["gifts-for-kids", "toys-plush"] },
    ],
  },

  // ---------- 2. Gaming ----------
  {
    email: "respawn@demo.atbp", name: "Jayvee Ocampo", username: "respawnmanila",
    shopName: "Respawn Manila", handle: "respawnmanila", category: "gaming",
    description: "Used and retro games, consoles, and accessories — tested before it ships.",
    story: "Grew up trading games at school. Turned that hustle into a proper shop for fellow gamers.",
    province: "Manila City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "PS4 Slim 500GB (Used, Tested)", desc: "Working unit, includes 1 controller and cables.", price: 8500, condition: "GOOD", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers"] },
      { title: "Nintendo Switch Pro Controller", desc: "Used, all buttons responsive, cleaned and tested.", price: 2200, condition: "EXCELLENT", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-2500"] },
      { title: "Retro SNES Console + 2 Games", desc: "Classic SNES console bundle, powers on and plays fine.", price: 3800, condition: "FAIR", type: "VINTAGE", images: PH.gameController, tags: ["for-gamers", "vintage-finds"] },
      { title: "Used PS4 Game: Bloodborne", desc: "Complete in case, disc lightly scratched but plays fine.", price: 800, condition: "GOOD", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-1000"] },
      { title: "Xbox Wireless Controller", desc: "Barely used, comes with original box.", price: 1800, condition: "LIKE_NEW", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-2500"] },
      { title: "Vintage Game Boy Color", desc: "Fully functional, screen has minor scratches.", price: 2500, condition: "FAIR", type: "VINTAGE", images: PH.gameController, tags: ["for-gamers", "vintage-finds"] },
      { title: "Used PS5 Game: Spider-Man 2", desc: "Played once, immaculate condition, all inserts included.", price: 1900, condition: "LIKE_NEW", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-2500"] },
      { title: "Retro Handheld Console (Brick Game)", desc: "Nostalgic brick game handheld, works great.", price: 450, type: "COLLECTIBLE", images: PH.gameController, tags: ["for-gamers", "under-500", "gifts"] },
      { title: "PS2 Slim with Memory Card", desc: "Classic PS2 slim, tested, comes with 8MB memory card.", price: 4200, condition: "GOOD", type: "VINTAGE", images: PH.gameController, tags: ["for-gamers", "vintage-finds"] },
      { title: "Controller Charging Dock (Dual)", desc: "Used charging stand for two wireless controllers.", price: 650, condition: "GOOD", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-1000"] },
      { title: "Used Nintendo 3DS XL", desc: "Includes stylus and charger, screen protector applied.", price: 3200, condition: "GOOD", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers"] },
      { title: "Gaming Headset (Wired)", desc: "Lightly used gaming headset with mic, tested working.", price: 950, condition: "EXCELLENT", type: "PRE_LOVED", images: PH.gameController, tags: ["for-gamers", "under-1000"] },
    ],
  },

  // ---------- 3. Pokémon / Trading Cards ----------
  {
    email: "cardboard@demo.atbp", name: "Miko Santiago", username: "cardboardkingdomph",
    shopName: "Cardboard Kingdom PH", handle: "cardboardkingdomph", category: "trading-cards",
    description: "Pokémon singles, sealed packs, and accessories for serious collectors.",
    story: "What started as opening packs with my kid brother turned into sourcing cards for collectors nationwide.",
    province: "Makati City", tier: "TOP", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Pokémon Charizard Single (Near Mint)", desc: "Base set-style single, sleeved and stored flat since pull.", price: 2800, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "for-collectors", "trading-cards"] },
      { title: "Pokémon Booster Pack (Sealed)", desc: "Factory-sealed booster pack, latest set.", price: 350, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "under-500", "trading-cards"] },
      { title: "Graded Pokémon Card (PSA-Style Slab)", desc: "Professionally graded and slabbed, grade 9.", price: 4500, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "for-collectors", "worth-the-splurge"] },
      { title: "Pokémon Card Binder (9-Pocket, 360 slots)", desc: "Side-loading binder pages, holds up to 360 cards.", price: 650, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["for-collectors", "under-1000"] },
      { title: "Pokémon Mystery Pack (5 Random Singles)", desc: "Curated mystery pack — at least one holo guaranteed.", price: 500, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "gifts", "under-500"] },
      { title: "Deck Box with Dice Tray", desc: "Sturdy card deck box with built-in dice tray.", price: 420, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["for-collectors", "under-500"] },
      { title: "Card Sleeves (100pc, Standard Size)", desc: "Clear protective sleeves, standard trading card size.", price: 150, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["for-collectors", "under-250"] },
      { title: "Pokémon Pikachu Single (Holo)", desc: "Fan-favorite holo single, sharp corners.", price: 950, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "gifts-for-kids", "under-1000"] },
      { title: "Vintage Pokémon Card Lot (20 Commons)", desc: "Bulk lot of older-era commons and uncommons.", price: 600, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "vintage-finds", "under-1000"] },
      { title: "Elite Trainer Box (Sealed)", desc: "Sealed booster box bundle with accessories.", price: 3200, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "for-collectors"] },
      { title: "One-Touch Card Display Case", desc: "Magnetic display case for a single premium card.", price: 380, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["for-collectors", "under-500"] },
      { title: "Pokémon Eevee Evolutions Set (5 Singles)", desc: "Complete Eeveelution set, all near mint.", price: 1800, type: "COLLECTIBLE", images: PH.pokemonCards, tags: ["pokemon", "for-collectors", "gifts"] },
    ],
  },

  // ---------- 4. Handmade Makeup ----------
  {
    email: "amihan@demo.atbp", name: "Joana Reyes", username: "amihanbeauty",
    shopName: "Amihan Beauty", handle: "amihanbeauty", category: "beauty",
    description: "Small-batch lip balms and tinted balms made with natural, skin-friendly ingredients.",
    story: "I started mixing balms in my kitchen after struggling to find gentle products for my own sensitive lips.",
    province: "Antipolo City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Calamansi Tinted Lip Balm", desc: "Sheer tint with a hint of citrus, beeswax base.", price: 220, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-250", "handmade-finds"] },
      { title: "Rosewater Lip Balm Tin", desc: "Moisturizing balm in a reusable tin, subtle rose scent.", price: 195, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-250"] },
      { title: "Natural Cream Blush Duo", desc: "Two-shade cream blush set, buildable and dewy finish.", price: 480, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-500"] },
      { title: "Body Shimmer Balm", desc: "Highlighting balm stick for face and body, subtle glow.", price: 350, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-500"] },
      { title: "Lip Balm Trio Gift Set", desc: "Three flavors in a small gift box — cocoa, mint, citrus.", price: 550, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "birthday-gifts", "under-1000"] },
      { title: "Makeup Brush Roll (Handmade Fabric)", desc: "Fabric brush organizer roll, holds up to 8 brushes.", price: 380, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-500"] },
      { title: "Overnight Lip Mask", desc: "Slugging-style lip treatment balm, thicker formula.", price: 260, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-500"] },
      { title: "Mini Beauty Gift Set (4pc)", desc: "Balm, blush, shimmer, and mirror — cute starter set.", price: 780, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "birthday-gifts"] },
      { title: "Vanilla Bean Lip Scrub", desc: "Sugar-based lip scrub, exfoliates before balm application.", price: 210, type: "HANDMADE", images: PH.lipBalm, tags: ["under-250"] },
      { title: "Cheek & Lip Tint Stick", desc: "Multi-use stick for cheeks and lips, one swipe application.", price: 320, type: "HANDMADE", images: PH.lipBalm, tags: ["gifts-for-her", "under-500"] },
    ],
  },

  // ---------- 5. Handmade Jewelry ----------
  {
    email: "likha@demo.atbp", name: "Carmela Ilustre", username: "likhastudio",
    shopName: "Likha Studio", handle: "likhastudio", category: "jewelry",
    description: "Handmade earrings, bracelets, and necklaces with Filipino-inspired motifs.",
    story: "Likha means 'to create' — every piece nods to a pattern, myth, or place close to home.",
    province: "Baguio City", tier: "ESTABLISHED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Sarimanok Drop Earrings", desc: "Brass drop earrings inspired by the mythical Sarimanok.", price: 480, type: "HANDMADE", images: PH.silverCuff, tags: ["gifts-for-her", "filipino-finds", "under-500"] },
      { title: "Banig-Pattern Beaded Bracelet", desc: "Woven-pattern beaded bracelet, adjustable cord.", price: 280, type: "HANDMADE", images: PH.silverCuff, tags: ["gifts-for-her", "filipino-finds", "under-500"] },
      { title: "Personalized Initial Necklace", desc: "Hand-stamped initial pendant on a delicate chain.", price: 450, type: "CUSTOM", images: PH.pendant, tags: ["personalized", "gifts-for-her", "under-500"] },
      { title: "Capiz Shell Hoop Earrings", desc: "Lightweight capiz shell hoops, iridescent finish.", price: 380, type: "HANDMADE", images: PH.silverCuff, tags: ["gifts-for-her", "filipino-finds", "under-500"] },
      { title: "Baguio Silver Ring", desc: "Hand-hammered sterling silver ring, made to order.", price: 950, type: "HANDMADE", images: PH.silverCuff, tags: ["gifts-for-her", "under-1000"] },
      { title: "Anting-Anting Pendant Necklace", desc: "Amulet-inspired pendant on a waxed cord.", price: 520, type: "HANDMADE", images: PH.pendant, tags: ["filipino-finds", "gifts-for-her"] },
      { title: "Stackable Ring Set (3pc)", desc: "Mixed-texture stacking rings, brass and silver-tone.", price: 420, type: "HANDMADE", images: PH.silverCuff, tags: ["gifts-for-her", "under-500"] },
      { title: "Woven Rattan Cuff Bracelet", desc: "Handwoven rattan cuff with brass clasp.", price: 350, type: "HANDMADE", images: PH.silverCuff, tags: ["filipino-finds", "under-500"] },
      { title: "Engraved Coordinates Bracelet", desc: "Custom coordinates engraved on a slim bar bracelet.", price: 580, type: "CUSTOM", images: PH.pendant, tags: ["personalized", "gifts-for-couples", "under-1000"] },
      { title: "Pearl Drop Earrings", desc: "Freshwater pearl drops on gold-tone hooks.", price: 650, type: "HANDMADE", images: PH.pendant, tags: ["gifts-for-her", "under-1000", "wedding-gifts"] },
    ],
  },

  // ---------- 6. Vintage ----------
  {
    email: "manilavintage@demo.atbp", name: "Ramon Cortez", username: "manilavintageco",
    shopName: "Manila Vintage Co.", handle: "manilavintageco", category: "vintage",
    description: "Curated vintage clothing, cameras, and home pieces — sourced, cleaned, and ready.",
    story: "Fifteen years of estate sales and ukay runs, now a shop instead of a garage full of boxes.",
    province: "Manila City", tier: "TOP", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Vintage 35mm Film Camera", desc: "Fully functional manual camera, light seals checked.", price: 3500, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "for-collectors"] },
      { title: "Retro Corduroy Jacket", desc: "70s-style corduroy jacket, men's medium.", price: 1400, condition: "GOOD", type: "VINTAGE", images: PH.denimJacket, tags: ["vintage-finds", "gifts-for-him"] },
      { title: "Vintage Leather Trench Coat", desc: "Classic silhouette, minor wear consistent with age.", price: 2200, condition: "FAIR", type: "VINTAGE", images: PH.trenchCoat, tags: ["vintage-finds", "worth-the-splurge"] },
      { title: "Antique Wall Clock", desc: "Wind-up wall clock, restored mechanism, working.", price: 1800, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "home"] },
      { title: "Retro Polaroid-Style Camera", desc: "Instant film camera from the 90s, tested working.", price: 2800, condition: "EXCELLENT", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "for-collectors"] },
      { title: "Vintage Denim Jacket (Faded Wash)", desc: "Naturally faded denim jacket, unisex medium.", price: 1200, condition: "GOOD", type: "VINTAGE", images: PH.denimJacket, tags: ["vintage-finds", "under-2500"] },
      { title: "Old School Film Rolls (Expired, 3pc)", desc: "Expired 35mm film for experimental shooters.", price: 450, type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "under-500"] },
      { title: "Mid-Century Table Lamp", desc: "Rewired for safety, brass base, cream shade.", price: 1950, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "home"] },
      { title: "Vintage Cat-Eye Sunglasses", desc: "Original 60s-style frames, lenses intact.", price: 850, condition: "GOOD", type: "VINTAGE", images: PH.trenchCoat, tags: ["vintage-finds", "gifts-for-her", "under-1000"] },
      { title: "Rotary Telephone (Working)", desc: "Restored rotary phone, converted for modern lines.", price: 2600, condition: "EXCELLENT", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "for-collectors"] },
    ],
  },

  // ---------- 7. Art ----------
  {
    email: "guhit@demo.atbp", name: "Bea Fernandez", username: "guhitstudio",
    shopName: "Guhit Studio", handle: "guhitstudio", category: "art",
    description: "Original paintings, prints, and illustrated art cards from an Iloilo-based artist.",
    story: "Guhit means 'to draw' — I paint scenes from home, then turn favorites into prints so more people can have one.",
    province: "Iloilo City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Original Acrylic Seascape (Small Canvas)", desc: "One-of-one acrylic seascape, 8x10 inch canvas.", price: 1500, type: "ART", images: PH.seascapePainting, tags: ["for-homebodies", "worth-the-splurge"] },
      { title: "Ink Portrait Print (A4)", desc: "Giclée print of an original ink portrait piece.", price: 450, type: "ART", images: PH.miniCanvas, tags: ["gifts", "under-500"] },
      { title: "Mini Canvas Set (4pc)", desc: "Set of four mini original acrylic studies.", price: 900, type: "ART", images: PH.miniCanvas, tags: ["gifts", "under-1000"] },
      { title: "Jeepney-Themed Art Print", desc: "Colorful jeepney illustration print, museum-quality paper.", price: 380, type: "ART", images: PH.seascapePainting, tags: ["filipino-finds", "under-500"] },
      { title: "Custom Pet Portrait (Digital Print)", desc: "Illustrated pet portrait printed on fine art paper.", price: 850, type: "CUSTOM", images: PH.miniCanvas, tags: ["personalized", "gifts", "under-1000"] },
      { title: "Art Sticker Sheet", desc: "Sheet of 8 illustrated stickers from original artwork.", price: 120, type: "ART", images: PH.miniCanvas, tags: ["under-250", "cute-finds"] },
      { title: "Art Card Set (Postcard Size, 6pc)", desc: "Printed postcards of original illustrations.", price: 250, type: "ART", images: PH.seascapePainting, tags: ["under-250", "gifts"] },
      { title: "Large Original Painting (Manila Bay Sunset)", desc: "24x36 inch original acrylic on canvas, signed.", price: 6500, type: "ART", images: PH.seascapePainting, tags: ["worth-the-splurge", "for-homebodies"] },
      { title: "Framed Illustration Print (A3)", desc: "Ready-to-hang framed print, wood frame included.", price: 1200, type: "ART", images: PH.miniCanvas, tags: ["home", "under-2500"] },
    ],
  },

  // ---------- 8. Filipino Crafts ----------
  {
    email: "habing@demo.atbp", name: "Lourdes Panganiban", username: "habinglokal",
    shopName: "Habing Lokal", handle: "habinglokal", category: "filipino-finds",
    description: "Woven bags, baskets, and home accents made with weaving communities in Iloilo.",
    story: "Habing means 'to weave' — every purchase supports the same weavers who taught me the craft.",
    province: "Iloilo City", tier: "ESTABLISHED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "Handwoven Buri Tote Bag", desc: "Natural buri palm tote, leather-trimmed handles.", price: 780, type: "HANDMADE", images: PH.toteBag, tags: ["filipino-finds", "gifts-for-her", "under-1000"] },
      { title: "Pandan Woven Basket (Medium)", desc: "Sturdy woven basket, great for storage or market runs.", price: 550, type: "HANDMADE", images: PH.rattanTray, tags: ["filipino-finds", "home", "under-1000"] },
      { title: "Woven Wall Accent (Sunburst)", desc: "Decorative sunburst wall hanging, natural fibers.", price: 950, type: "HANDMADE", images: PH.wallHanging, tags: ["filipino-finds", "home", "under-1000"] },
      { title: "Abaca Coasters (Set of 6)", desc: "Handwoven abaca fiber coasters, heat-resistant.", price: 320, type: "HANDMADE", images: PH.rattanTray, tags: ["filipino-finds", "under-500", "housewarming-gifts"] },
      { title: "Woven Clutch Bag", desc: "Compact woven clutch with magnetic closure.", price: 650, type: "HANDMADE", images: PH.toteBag, tags: ["filipino-finds", "gifts-for-her", "under-1000"] },
      { title: "Table Runner (Inabel-Inspired)", desc: "Handloom-inspired table runner, cotton blend.", price: 480, type: "HANDMADE", images: PH.wallHanging, tags: ["filipino-finds", "home", "under-500"] },
      { title: "Rattan Fruit Basket", desc: "Classic rattan basket, sturdy weave, natural finish.", price: 420, type: "HANDMADE", images: PH.rattanTray, tags: ["filipino-finds", "home", "under-500"] },
      { title: "Woven Placemats (Set of 4)", desc: "Handwoven placemats, wipeable natural fiber.", price: 380, type: "HANDMADE", images: PH.wallHanging, tags: ["filipino-finds", "under-500"] },
    ],
  },

  // ---------- 9. Anime ----------
  {
    email: "otaku@demo.atbp", name: "Kenji Alvarado", username: "otakutambayan",
    shopName: "Otaku Tambayan", handle: "otakutambayan", category: "anime",
    description: "Anime figures, manga, pins, and posters for the certified otaku.",
    story: "Tambayan means 'hangout' — this shop is basically my anime hangout turned into a store.",
    province: "Pasig City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Anime Figure (Shonen Protagonist, 7-inch)", desc: "Detailed PVC figure, boxed with certificate card.", price: 1800, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["anime", "for-collectors", "for-anime-fans"] },
      { title: "Manga Volume Set (1-5)", desc: "Complete starter arc, English translation.", price: 1200, type: "COLLECTIBLE", images: PH.booksStack, tags: ["anime", "books", "for-anime-fans"] },
      { title: "Anime Enamel Pin Set (5pc)", desc: "Character enamel pins, backing card included.", price: 350, type: "COLLECTIBLE", images: PH.pinSticker, tags: ["anime", "for-anime-fans", "under-500"] },
      { title: "Studio Poster Print (A2)", desc: "Official-style poster print, matte finish.", price: 280, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["anime", "under-500", "for-anime-fans"] },
      { title: "Chibi Keychain (Blind Box)", desc: "Sealed blind box keychain, 6 designs to collect.", price: 250, type: "COLLECTIBLE", images: PH.funko, tags: ["anime", "under-250", "cute-finds"] },
      { title: "Anime Figure (Swordsman, 9-inch)", desc: "Dynamic pose figure, painted details.", price: 2400, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["anime", "for-collectors", "worth-the-splurge"] },
      { title: "Acrylic Standee (Character Set)", desc: "Set of 3 acrylic standees with stands.", price: 480, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["anime", "for-anime-fans", "under-500"] },
      { title: "Anime Tote Bag (Printed)", desc: "Canvas tote with printed character art.", price: 420, type: "COLLECTIBLE", images: PH.toteBag, tags: ["anime", "gifts", "under-500"] },
      { title: "Figure Display Case (Dustproof)", desc: "Acrylic display case, protects figures from dust.", price: 650, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["for-collectors", "under-1000"] },
      { title: "Manga Box Set (Complete Series)", desc: "Full series box set with slipcase.", price: 3500, type: "COLLECTIBLE", images: PH.booksStack, tags: ["anime", "books", "worth-the-splurge"] },
    ],
  },

  // ---------- 10. Books ----------
  {
    email: "secondchapter@demo.atbp", name: "Divina Cruz", username: "secondchapterph",
    shopName: "Second Chapter PH", handle: "secondchapterph", category: "books",
    description: "Used books, Filipino literature, and manga — every book deserves a second chapter.",
    story: "A book hoarder's overflow shelf turned into a shop, because good books shouldn't just sit there.",
    province: "Quezon City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Noli Me Tangere (Paperback, Used)", desc: "Well-loved copy, some highlighting on early pages.", price: 250, condition: "GOOD", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "filipino-finds", "under-500"] },
      { title: "Filipino Short Story Anthology", desc: "Collection of contemporary Filipino short fiction.", price: 380, condition: "LIKE_NEW", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "filipino-finds", "under-500"] },
      { title: "Used Manga Bundle (5 Random Volumes)", desc: "Mixed genre manga bundle, good condition.", price: 450, condition: "GOOD", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "anime", "under-500"] },
      { title: "Children's Picture Book Set (3pc)", desc: "Gently used picture books, great starter set.", price: 320, condition: "GOOD", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "gifts-for-kids", "under-500"] },
      { title: "Vintage Hardbound Classic Novel", desc: "1970s printing, cover shows age but binding is solid.", price: 550, condition: "FAIR", type: "VINTAGE", images: PH.booksStack, tags: ["books", "vintage-finds", "under-1000"] },
      { title: "Self-Help Bestseller (Used)", desc: "Popular self-help title, light shelf wear.", price: 280, condition: "GOOD", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "under-500"] },
      { title: "Poetry Collection (Filipino Author)", desc: "Signed copy from a local poetry reading.", price: 420, condition: "LIKE_NEW", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "filipino-finds", "gifts"] },
      { title: "Pre-Loved Cookbook (Filipino Recipes)", desc: "Well-used but complete, some stains from actual cooking.", price: 350, condition: "FAIR", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "filipino-finds", "under-500"] },
      { title: "Coffee Table Photography Book", desc: "Large-format photography book, minor cover wear.", price: 950, condition: "GOOD", type: "PRE_LOVED", images: PH.booksStack, tags: ["books", "home", "under-1000"] },
    ],
  },

  // ---------- 11. Toys ----------
  {
    email: "toytrove@demo.atbp", name: "Arnold Villareal", username: "toytrovemanila",
    shopName: "Toy Trove Manila", handle: "toytrovemanila", category: "hobby-toys",
    description: "Action figures, blind boxes, and vintage toys for collectors and kids alike.",
    story: "My childhood toy box became a full inventory once other parents started asking where I got mine.",
    province: "Manila City", tier: "TRUSTED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Vintage Toy Soldier Set (12pc)", desc: "Classic green army men, full unopened set.", price: 280, type: "VINTAGE", images: PH.toyFigure, tags: ["vintage-finds", "gifts-for-kids", "under-500"] },
      { title: "Action Figure (Articulated, 6-inch)", desc: "Highly poseable action figure with accessories.", price: 850, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["for-collectors", "under-1000"] },
      { title: "Robot Toy (Light-Up, Battery)", desc: "Light-up robot toy, batteries included.", price: 650, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["gifts-for-kids", "under-1000"] },
      { title: "Blind Box Mini Figure (Series 3)", desc: "Sealed mystery figure, 12 designs in the series.", price: 220, type: "COLLECTIBLE", images: PH.funko, tags: ["cute-finds", "under-250"] },
      { title: "Model Kit (Snap-Fit Robot)", desc: "No-glue model kit, beginner-friendly.", price: 950, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["for-collectors", "under-1000"] },
      { title: "Vintage Tin Toy (Wind-Up)", desc: "Restored wind-up tin toy, works as intended.", price: 1200, type: "VINTAGE", images: PH.toyFigure, tags: ["vintage-finds", "for-collectors"] },
      { title: "Toy Figure Display Set (5pc)", desc: "Assorted mini figures for shelf display.", price: 480, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["gifts-for-kids", "under-500"] },
      { title: "Classic Board Game (Complete)", desc: "Family board game, all pieces accounted for.", price: 750, condition: "GOOD", type: "PRE_LOVED", images: PH.toyFigure, tags: ["gifts-for-kids", "under-1000"] },
    ],
  },

  // ---------- 12. Car / Motorcycle ----------
  {
    email: "garagefinds@demo.atbp", name: "Danilo Reyes", username: "garagefindsph",
    shopName: "Garage Finds PH", handle: "garagefindsph", category: "automotive",
    description: "Car and motorcycle accessories, riding gear, and the occasional vintage automotive find.",
    story: "Weekend rides turned into a parts hustle among riding buddies — now it's a proper shop.",
    province: "Batangas City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Motorcycle Half-Helmet (DOT Certified)", desc: "Lightweight half helmet, multiple sizes available.", price: 2200, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "for-car-motorcycle-fans", "under-2500"] },
      { title: "Riding Gloves (Reinforced Knuckle)", desc: "Breathable riding gloves with knuckle protection.", price: 850, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "for-car-motorcycle-fans", "under-1000"] },
      { title: "Motorcycle Phone Mount", desc: "Vibration-dampening handlebar phone mount.", price: 450, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "for-car-motorcycle-fans", "under-500"] },
      { title: "Car Dashboard Organizer", desc: "Multi-pocket dashboard caddy, universal fit.", price: 380, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "under-500"] },
      { title: "Riding Jacket (Reflective Panels)", desc: "All-weather riding jacket with reflective safety strips.", price: 2800, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "for-car-motorcycle-fans", "worth-the-splurge"] },
      { title: "Vintage Motorcycle Badge (Collectible)", desc: "Old-school enamel motorcycle brand badge.", price: 650, type: "VINTAGE", images: PH.motorcycleGear, tags: ["automotive", "vintage-finds", "for-collectors"] },
      { title: "Universal Car Decal Set", desc: "Vinyl decal set, weatherproof, easy application.", price: 280, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "under-500"] },
      { title: "Motorcycle Tool Kit (Compact)", desc: "Essential roadside tool kit, fits under the seat.", price: 950, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "gifts-for-him", "under-1000"] },
      { title: "Riding Boots (Ankle Support)", desc: "Reinforced riding boots with ankle support.", price: 3200, type: "COLLECTIBLE", images: PH.motorcycleGear, tags: ["automotive", "worth-the-splurge"] },
    ],
  },

  // ---------- 13. Home ----------
  {
    email: "casalokal@demo.atbp", name: "Fely Aquino", username: "casalokal",
    shopName: "Casa Lokal", handle: "casalokal", category: "home-living",
    description: "Handmade candles, pottery, and home accents to make any space feel like home.",
    story: "I make what I'd actually want on my own shelves — nothing mass-produced, everything small-batch.",
    province: "Santa Rosa City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Soy Wax Candle (Coconut & Vanilla)", desc: "Hand-poured soy candle, 40-hour burn time.", price: 380, type: "HANDMADE", images: PH.coconutCandle, tags: ["home", "for-homebodies", "housewarming-gifts", "under-500"] },
      { title: "Stoneware Dinner Plate Set (4pc)", desc: "Hand-glazed stoneware plates, dishwasher safe.", price: 1800, type: "HANDMADE", images: PH.ceramicBowls, tags: ["home", "housewarming-gifts", "under-2500"] },
      { title: "Wall Organizer Basket", desc: "Woven wall-mount basket for mail and keys.", price: 420, type: "HANDMADE", images: PH.rattanTray, tags: ["home", "for-homebodies", "under-500"] },
      { title: "Ceramic Vase (Speckled Glaze)", desc: "Hand-thrown ceramic vase, unique speckled finish.", price: 850, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "housewarming-gifts", "under-1000"] },
      { title: "Scented Candle Trio Gift Set", desc: "Three mini candles in a gift box.", price: 650, type: "HANDMADE", images: PH.coconutCandle, tags: ["gifts", "housewarming-gifts", "under-1000"] },
      { title: "Handmade Ceramic Mug", desc: "Wheel-thrown mug, holds 300ml, food-safe glaze.", price: 480, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "gifts", "under-500"] },
      { title: "Woven Placemat Set (4pc)", desc: "Natural fiber placemats, wipeable surface.", price: 350, type: "HANDMADE", images: PH.rattanTray, tags: ["home", "under-500"] },
      { title: "Minimalist Wall Clock", desc: "Simple wood-frame wall clock, silent movement.", price: 950, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "for-homebodies", "under-1000"] },
    ],
  },

  // ---------- 14. Fashion ----------
  {
    email: "secondlook@demo.atbp", name: "Yumi Torres", username: "secondlookph",
    shopName: "Second Look PH", handle: "secondlookph", category: "fashion",
    description: "Pre-loved clothing, vintage shirts, and accessories — thrifted finds worth a second look.",
    story: "Started reselling my own closet overflow. Now I curate racks from ukay runs across the metro.",
    province: "Makati City", tier: "TOP", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Vintage Band Tee (Faded Print)", desc: "Authentic vintage tour tee, soft worn-in fabric.", price: 650, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["fashion", "vintage-finds", "gifts-for-him", "under-1000"] },
      { title: "Pre-Loved Leather Jacket", desc: "Genuine leather, minor creasing, great patina.", price: 2400, condition: "GOOD", type: "PRE_LOVED", images: PH.trenchCoat, tags: ["fashion", "vintage-finds", "worth-the-splurge"] },
      { title: "Thrifted Denim Jacket", desc: "Classic trucker jacket, medium wash.", price: 950, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["fashion", "under-1000"] },
      { title: "Vintage Silk Scarf", desc: "Printed silk scarf, excellent condition.", price: 380, condition: "EXCELLENT", type: "PRE_LOVED", images: PH.trenchCoat, tags: ["fashion", "gifts-for-her", "under-500"] },
      { title: "Pre-Loved Trench Coat", desc: "Classic beige trench, dry-cleaned before listing.", price: 1800, condition: "GOOD", type: "PRE_LOVED", images: PH.trenchCoat, tags: ["fashion", "vintage-finds", "under-2500"] },
      { title: "Thrifted Graphic Sweatshirt", desc: "Soft fleece sweatshirt, retro graphic print.", price: 550, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["fashion", "under-1000"] },
      { title: "Pre-Loved Leather Belt", desc: "Genuine leather belt, brass buckle, adjustable.", price: 320, condition: "GOOD", type: "PRE_LOVED", images: PH.leatherBag, tags: ["fashion", "gifts-for-him", "under-500"] },
      { title: "Vintage Bomber Jacket", desc: "90s-style bomber, satin lining intact.", price: 1600, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["fashion", "vintage-finds", "under-2500"] },
    ],
  },

  // ---------- 15. Custom Products ----------
  {
    email: "madeforyou@demo.atbp", name: "Patricia Lim", username: "madeforyouph",
    shopName: "Made For You PH", handle: "madeforyouph", category: "custom",
    description: "Personalized mugs, shirts, keychains, and frames — made to order, made for someone specific.",
    story: "Every order starts with a name or a date that matters. That personal touch is the whole point.",
    province: "Bulacan", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Personalized Name Mug", desc: "Custom name and message printed on a ceramic mug.", price: 280, type: "CUSTOM", images: PH.resinKeychain, tags: ["personalized", "gifts", "under-500"] },
      { title: "Custom Photo Keychain", desc: "Your photo printed on a durable acrylic keychain.", price: 180, type: "CUSTOM", images: PH.resinKeychain, tags: ["personalized", "gifts", "under-250"] },
      { title: "Engraved Wooden Frame", desc: "Personalized engraving on a solid wood photo frame.", price: 650, type: "CUSTOM", images: PH.resinOrnament, tags: ["personalized", "gifts", "housewarming-gifts", "under-1000"] },
      { title: "Custom Name Shirt (Adult Sizes)", desc: "Printed cotton shirt with your chosen name or text.", price: 420, type: "CUSTOM", images: PH.resinKeychain, tags: ["personalized", "gifts", "under-500"] },
      { title: "Resin Photo Ornament", desc: "Hand-poured resin ornament with embedded photo.", price: 380, type: "CUSTOM", images: PH.resinOrnament, tags: ["personalized", "christmas-gifts", "under-500"] },
      { title: "Personalized Couple Tumbler Set", desc: "Matching tumblers with custom names, set of 2.", price: 750, type: "CUSTOM", images: PH.resinKeychain, tags: ["personalized", "gifts-for-couples", "anniversary-gifts", "under-1000"] },
      { title: "Custom Pet Name Tag", desc: "Engraved pet ID tag, choose shape and text.", price: 150, type: "CUSTOM", images: PH.resinKeychain, tags: ["personalized", "under-250"] },
      { title: "Engraved Wedding Cake Topper", desc: "Custom names and date, laser-cut wood.", price: 480, type: "CUSTOM", images: PH.resinOrnament, tags: ["personalized", "wedding-gifts", "under-500"] },
    ],
  },

  // ---------- 16. Sneakers ----------
  {
    email: "kicksmanila@demo.atbp", name: "Enzo Bautista", username: "kicksmanila",
    shopName: "Kicks Manila", handle: "kicksmanila", category: "streetwear",
    description: "Pre-loved and rare sneakers, cleaned and authenticated before every sale.",
    story: "Started reselling my own rotation to fund the next pair. Now half of Taguig buys sneakers from me.",
    province: "Taguig City", tier: "TOP", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Retro High-Top Sneakers (Used, Size 9)", desc: "Cleaned and deodorized, some creasing on toe box.", price: 4500, condition: "GOOD", type: "PRE_LOVED", images: PH.sneakers, tags: ["fashion", "sneakers", "streetwear", "gifts-for-him", "under-2500", "worth-the-splurge"] },
      { title: "Classic Runner Sneakers (Size 10)", desc: "Lightly worn, original box included.", price: 3200, condition: "EXCELLENT", type: "PRE_LOVED", images: PH.sneakers, tags: ["fashion", "sneakers", "streetwear", "under-2500"] },
      { title: "Court Sneakers (Deadstock, Size 8)", desc: "Never worn, tags still attached.", price: 5800, condition: "BRAND_NEW", type: "PRE_LOVED", images: PH.sneakers, tags: ["fashion", "sneakers", "streetwear", "worth-the-splurge"] },
      { title: "Sneaker Cleaning Kit", desc: "Brush, solution, and wipes for sneaker maintenance.", price: 450, type: "COLLECTIBLE", images: PH.sneakers, tags: ["sneakers", "gifts-for-him", "under-500"] },
      { title: "Basketball Sneakers (Used, Size 11)", desc: "Good tread remaining, minor sole yellowing.", price: 2800, condition: "GOOD", type: "PRE_LOVED", images: PH.sneakers, tags: ["fashion", "sneakers", "streetwear", "under-2500"] },
      { title: "Sneaker Display Shelf Stand", desc: "Acrylic riser for displaying your sneaker rotation.", price: 650, type: "COLLECTIBLE", images: PH.sneakers, tags: ["sneakers", "for-homebodies", "under-1000"] },
      { title: "Collab-Style Sneakers (Rare Colorway)", desc: "Hard-to-find colorway, worn twice.", price: 7500, condition: "LIKE_NEW", type: "PRE_LOVED", images: PH.sneakers, tags: ["fashion", "sneakers", "streetwear", "worth-the-splurge", "for-collectors"] },
    ],
  },

  // ---------- 17. Streetwear ----------
  {
    email: "blockthreads@demo.atbp", name: "Marco De Leon", username: "blockthreadsph",
    shopName: "Block Threads PH", handle: "blockthreadsph", category: "streetwear",
    description: "Streetwear hoodies, caps, and graphic tees for the everyday fit.",
    story: "Just started this year — designing pieces I actually wanted to see on the block.",
    province: "Quezon City", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Oversized Graphic Hoodie", desc: "Heavyweight cotton hoodie, boxy fit, original print.", price: 950, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "fashion", "gifts-for-him", "under-1000"] },
      { title: "Snapback Cap (Embroidered Logo)", desc: "Structured snapback, embroidered front logo.", price: 480, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "under-500"] },
      { title: "Cropped Bomber Jacket", desc: "Cropped fit bomber, ribbed cuffs.", price: 1400, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "fashion", "under-2500"] },
      { title: "Graphic Tee (Screen Printed)", desc: "Heavyweight cotton tee, original screen print design.", price: 550, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "under-1000"] },
      { title: "Utility Cargo Pants", desc: "Multi-pocket cargo pants, adjustable straps.", price: 1200, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "fashion", "under-2500"] },
      { title: "Beanie (Ribbed Knit)", desc: "Warm ribbed knit beanie, one size fits most.", price: 350, type: "HANDMADE", images: PH.streetwear, tags: ["streetwear", "under-500"] },
    ],
  },

  // ---------- 18. Food & Snacks ----------
  {
    email: "sarapatbp@demo.atbp", name: "Nena Villanueva", username: "sarapatbp",
    shopName: "Sarap Atbp", handle: "sarapatbp", category: "food-snacks",
    description: "Local snacks and pasalubong favorites, packed shelf-stable and shipped nationwide.",
    story: "Homesick friends abroad kept asking me to send snacks — turns out a lot of people feel the same way.",
    province: "Angeles City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      {
        title: "Homemade Polvoron (Box of 12)", desc: "Classic pinipig polvoron, individually wrapped.", price: 280, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "gifts", "under-500"],
        categorySlug: "food-snacks",
        food: { shelfStable: true, expiryInfo: "Best consumed within 2 months of purchase", ingredients: "Toasted flour, powdered milk, sugar, pinipig, butter", allergens: "Contains milk, gluten", foodShippingNotes: "Individually wrapped and boxed to survive shipping." },
      },
      {
        title: "Dried Mango Pack (250g)", desc: "Sweet dried mango slices, no preservatives added.", price: 180, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-250"],
        categorySlug: "dried-snacks",
        food: { shelfStable: true, expiryInfo: "Best consumed within 6 months, unopened", ingredients: "100% dried mango, cane sugar", allergens: "None", foodShippingNotes: "Vacuum-sealed for freshness during transit." },
      },
      {
        title: "Pasalubong Snack Box (Assorted)", desc: "Mixed local snacks box — great balikbayan gift.", price: 650, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "gifts", "under-1000"],
        categorySlug: "snack-boxes",
        food: { shelfStable: true, expiryInfo: "Assorted items — earliest expiry printed on the box", ingredients: "Varies by item — full list included inside the box", allergens: "May contain milk, peanuts, gluten, soy", foodShippingNotes: "Boxed with dividers so nothing crushes in transit." },
      },
      {
        title: "Homemade Chicharon (Spicy)", desc: "Crunchy pork chicharon with vinegar spice mix.", price: 220, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-250"],
        categorySlug: "chips",
        food: { shelfStable: true, expiryInfo: "Best consumed within 3 months of purchase", ingredients: "Pork rinds, chili, vinegar seasoning", allergens: "None", foodShippingNotes: "Packed in a rigid container to prevent crushing." },
      },
      {
        title: "Kakanin Sampler Box", desc: "Assorted rice cakes — biko, sapin-sapin, kutsinta.", price: 380, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-500"],
        categorySlug: "food-snacks",
        food: { shelfStable: false, expiryInfo: "Best consumed within 2 days — not shelf-stable", ingredients: "Glutinous rice, coconut milk, sugar, ube", allergens: "Contains coconut", foodShippingNotes: "Local delivery / pickup only — not shipped due to short shelf life." },
      },
      {
        title: "Ube Jam (Homemade, 250g)", desc: "Thick, slow-cooked ube halaya in a jar.", price: 320, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-500"],
        categorySlug: "spreads",
        food: { shelfStable: true, expiryInfo: "Best consumed within 3 months unopened; refrigerate after opening", ingredients: "Ube (purple yam), condensed milk, butter, sugar", allergens: "Contains milk", foodShippingNotes: "Glass jar — packed with padding for shipping." },
      },
      {
        title: "Butter Cookies (Tin of 20)", desc: "Classic Danish-style butter cookies, individually cupped.", price: 350, type: "HANDMADE", images: PH.coffeeBeans, tags: ["gifts", "under-500"],
        categorySlug: "cookies",
        food: { shelfStable: true, expiryInfo: "Best consumed within 4 months, unopened tin", ingredients: "Butter, flour, sugar, eggs, vanilla", allergens: "Contains milk, gluten, eggs", foodShippingNotes: "Tin packaging protects cookies from breaking in transit." },
      },
      {
        title: "Yema Candy (Box of 24)", desc: "Traditional custard candy, individually wrapped.", price: 250, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-500"],
        categorySlug: "candies",
        food: { shelfStable: true, expiryInfo: "Best consumed within 1 month of purchase", ingredients: "Condensed milk, egg yolks, sugar", allergens: "Contains milk, eggs", foodShippingNotes: "Keep away from heat — best shipped with standard courier, not left in transit heat too long." },
      },
      {
        title: "Adobo Sauce Kit (Bottled)", desc: "Ready-to-use adobo marinade, just add meat.", price: 220, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-250"],
        categorySlug: "sauces-condiments",
        food: { shelfStable: true, expiryInfo: "Best consumed within 6 months unopened; refrigerate after opening", ingredients: "Soy sauce, vinegar, garlic, bay leaf, peppercorn", allergens: "Contains soy", foodShippingNotes: "Glass bottle, sealed and padded for shipping." },
      },
    ],
  },

  // ---------- 19. Coffee & Tea ----------
  {
    email: "barako@demo.atbp", name: "Teodoro Villanueva", username: "barakoroastery",
    shopName: "Barako Roastery", handle: "barakoroastery", category: "coffee-tea",
    description: "Small-batch roasted coffee beans sourced from Batangas farms.",
    story: "My family's been growing barako coffee for three generations — I just started roasting and selling it directly.",
    province: "Batangas City", tier: "ESTABLISHED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      {
        title: "Batangas Barako Beans (250g)", desc: "Whole bean, medium roast, bold and earthy.", price: 380, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "gifts", "under-500"],
        categorySlug: "coffee-tea",
        food: { shelfStable: true, expiryInfo: "Best consumed within 6 months of roast date", ingredients: "100% arabica/liberica coffee beans", allergens: "None", foodShippingNotes: "Resealable bag with one-way degassing valve." },
      },
      {
        title: "Barako Coffee Gift Set", desc: "250g beans plus a ceramic mug, boxed.", price: 850, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "gifts", "under-1000"],
        categorySlug: "food-gift-boxes",
        food: { shelfStable: true, expiryInfo: "Coffee best consumed within 6 months of roast date", ingredients: "100% coffee beans; mug is non-food item", allergens: "None", foodShippingNotes: "Boxed with padding to protect the ceramic mug in transit." },
      },
      {
        title: "Ground Coffee (500g, Dark Roast)", desc: "Pre-ground dark roast, ready to brew.", price: 550, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-1000"],
        categorySlug: "coffee-tea",
        food: { shelfStable: true, expiryInfo: "Best consumed within 4 months of roast date", ingredients: "100% coffee beans, ground", allergens: "None", foodShippingNotes: "Resealable bag with one-way degassing valve." },
      },
      {
        title: "Drip Coffee Bags (10pc)", desc: "Single-serve drip bags, no equipment needed.", price: 320, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-500"],
        categorySlug: "coffee-tea",
        food: { shelfStable: true, expiryInfo: "Best consumed within 6 months, unopened", ingredients: "100% ground coffee in a drip filter", allergens: "None", foodShippingNotes: "Individually sealed bags, safe for standard shipping." },
      },
      {
        title: "Coffee Sampler Trio (3 x 100g)", desc: "Three roast levels to compare, resealable bags.", price: 480, type: "HANDMADE", images: PH.coffeeBeans, tags: ["gifts", "under-500"],
        categorySlug: "food-gift-boxes",
        food: { shelfStable: true, expiryInfo: "Best consumed within 6 months of roast date", ingredients: "100% coffee beans", allergens: "None", foodShippingNotes: "Boxed set, resealable bags inside." },
      },
      {
        title: "Salabat Ginger Tea Bags (20pc)", desc: "Dried ginger tea bags, no added sugar.", price: 200, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "under-250"],
        categorySlug: "coffee-tea",
        food: { shelfStable: true, expiryInfo: "Best consumed within 8 months, unopened", ingredients: "100% dried ginger", allergens: "None", foodShippingNotes: "Sealed pouch, safe for standard shipping." },
      },
      {
        title: "Trail Mix Nut Pack (300g)", desc: "Roasted peanuts, cashews, and almonds, lightly salted.", price: 260, type: "HANDMADE", images: PH.coffeeBeans, tags: ["under-500"],
        categorySlug: "nuts",
        food: { shelfStable: true, expiryInfo: "Best consumed within 4 months, unopened", ingredients: "Peanuts, cashews, almonds, salt", allergens: "Contains peanuts, tree nuts", foodShippingNotes: "Resealable pouch, safe for standard shipping." },
      },
      {
        title: "Tablea Chocolate Tablets (Box of 12)", desc: "Pure roasted cacao tablets for sikwate hot chocolate.", price: 300, type: "HANDMADE", images: PH.coffeeBeans, tags: ["filipino-finds", "gifts", "under-500"],
        categorySlug: "chocolates",
        food: { shelfStable: true, expiryInfo: "Best consumed within 12 months, unopened", ingredients: "100% roasted cacao", allergens: "None", foodShippingNotes: "Keep away from heat during transit — wrapped individually." },
      },
    ],
  },

  // ---------- 20. Plants ----------
  {
    email: "halaman@demo.atbp", name: "Grace Manalo", username: "halamanhaven",
    shopName: "Halaman Haven", handle: "halamanhaven", category: "plants",
    description: "Potted succulents, air plants, and low-maintenance greens for plant parents.",
    story: "My apartment balcony turned into a jungle. Sharing the overflow felt like the right thing to do.",
    province: "Antipolo City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Succulent Trio (Assorted, Potted)", desc: "Three assorted succulents in matching terracotta pots.", price: 450, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "gifts", "under-500"] },
      { title: "Snake Plant (Medium, Ceramic Pot)", desc: "Air-purifying snake plant in a glazed ceramic pot.", price: 650, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "housewarming-gifts", "under-1000"] },
      { title: "Air Plant Set (5pc)", desc: "No-soil air plants, mist weekly to thrive.", price: 380, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "under-500"] },
      { title: "Monstera Cutting (Rooted)", desc: "Established rooted cutting, ready to pot.", price: 550, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "under-1000"] },
      { title: "Terracotta Pot Set (3 Sizes)", desc: "Unglazed terracotta pots, drainage holes included.", price: 320, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "under-500"] },
      { title: "Desk Succulent Gift Box", desc: "Single succulent in a decorative box, ready to gift.", price: 280, type: "HANDMADE", images: PH.plants, tags: ["for-plant-lovers", "gifts", "under-500"] },
    ],
  },

  // ---------- 21. Stationery / Journaling ----------
  {
    email: "papelattinta@demo.atbp", name: "Isabel Chua", username: "papelattinta",
    shopName: "Papel at Tinta", handle: "papelattinta", category: "stationery",
    description: "Journals, planners, and pens for people who love writing things down.",
    story: "Just launched this year, sourcing paper goods I couldn't find enough of myself.",
    province: "Cavite City", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Dotted Grid Journal (A5)", desc: "160gsm paper, ribbon bookmark, elastic closure.", price: 420, type: "HANDMADE", images: PH.stationery, tags: ["gifts", "under-500"] },
      { title: "Undated Weekly Planner", desc: "Flexible undated planner, starts any week.", price: 480, type: "HANDMADE", images: PH.stationery, tags: ["gifts", "under-500"] },
      { title: "Fountain Pen (Fine Nib)", desc: "Entry-level fountain pen, smooth fine nib.", price: 650, type: "HANDMADE", images: PH.stationery, tags: ["gifts-for-him", "under-1000"] },
      { title: "Washi Tape Set (10 Rolls)", desc: "Assorted patterns for journaling and decorating.", price: 280, type: "HANDMADE", images: PH.stationery, tags: ["under-500", "cute-finds"] },
      { title: "Personalized Notebook Cover", desc: "Engraved name or initials on a leather-look cover.", price: 380, type: "CUSTOM", images: PH.stationery, tags: ["personalized", "gifts", "under-500"] },
    ],
  },

  // ---------- 22. Crochet ----------
  {
    email: "loopandlana@demo.atbp", name: "Marilou Santos", username: "loopandlana",
    shopName: "Loop & Lana", handle: "loopandlana", category: "handmade",
    description: "Crocheted plushies, bags, and baby items made one stitch at a time.",
    story: "Learned to crochet from my lola. Every pattern I make is a little tribute to her patience.",
    province: "Antipolo City", tier: "NEW", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Crocheted Amigurumi Bear", desc: "Handmade crochet plushie, safety eyes, 8-inch tall.", price: 480, type: "HANDMADE", images: PH.crochet, tags: ["gifts-for-kids", "cute-finds", "under-500"] },
      { title: "Crochet Market Bag", desc: "Cotton crochet net bag, stretches to fit groceries.", price: 380, type: "HANDMADE", images: PH.crochet, tags: ["handmade-finds", "under-500"] },
      { title: "Baby Crochet Booties", desc: "Soft cotton yarn booties, newborn size.", price: 280, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-500"] },
      { title: "Crochet Flower Coasters (Set of 4)", desc: "Colorful flower-shaped coasters, cotton yarn.", price: 250, type: "HANDMADE", images: PH.crochet, tags: ["home", "under-500"] },
      { title: "Crochet Baby Blanket", desc: "Soft granny-square blanket, machine washable.", price: 950, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-1000"] },
    ],
  },

  // ---------- 23. Ceramics ----------
  {
    email: "lupaceramics@demo.atbp", name: "Andres Villaflor", username: "lupaceramics",
    shopName: "Lupa Ceramics", handle: "lupaceramics", category: "home-living",
    description: "Wheel-thrown stoneware for everyday use — mugs, bowls, and vases fired in a home kiln.",
    story: "Lupa means 'earth' — I like that the clay literally comes from the ground beneath us.",
    province: "Santa Rosa City", tier: "ESTABLISHED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "Speckled Stoneware Mug", desc: "Food-safe glaze, holds 320ml, dishwasher safe.", price: 450, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "gifts", "under-500"] },
      { title: "Nesting Bowl Set (3pc)", desc: "Hand-thrown nesting bowls, matte finish.", price: 1200, type: "HANDMADE", images: PH.ceramicBowls, tags: ["home", "housewarming-gifts", "under-2500"] },
      { title: "Ceramic Vase (Tall, Ribbed)", desc: "Ribbed texture vase, unique per piece.", price: 850, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "under-1000"] },
      { title: "Handmade Ceramic Plate Set (4pc)", desc: "Dinner plates, hand-glazed, oven safe.", price: 1600, type: "HANDMADE", images: PH.ceramicBowls, tags: ["home", "under-2500"] },
      { title: "Ceramic Soap Dish", desc: "Drainage-ridged soap dish, matte white glaze.", price: 280, type: "HANDMADE", images: PH.ceramicMug, tags: ["home", "under-500"] },
    ],
  },

  // ---------- 24. Woodworking ----------
  {
    email: "kahoy@demo.atbp", name: "Efren Dizon", username: "kahoycraftworks",
    shopName: "Kahoy Craftworks", handle: "kahoycraftworks", category: "home-living",
    description: "Hand-carved wooden decor and small furniture pieces, made in a backyard workshop.",
    story: "Retired from carpentry, but couldn't stop making things — so now I sell them instead of stacking them.",
    province: "Bulacan", tier: "TRUSTED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "Carved Wooden Bowl", desc: "Hand-carved from reclaimed narra wood, food-safe finish.", price: 950, type: "HANDMADE", images: PH.carvedFigure, tags: ["home", "under-1000"] },
      { title: "Wooden Cutting Board (Engraved)", desc: "Solid wood board, optional name engraving.", price: 650, type: "HANDMADE", images: PH.carvedFigure, tags: ["personalized", "housewarming-gifts", "under-1000"] },
      { title: "Wooden Wall Shelf (Floating)", desc: "Minimalist floating shelf, hardware included.", price: 780, type: "HANDMADE", images: PH.carvedFigure, tags: ["home", "under-1000"] },
      { title: "Carved Wooden Figurine", desc: "Hand-carved decorative figure, narra wood.", price: 550, type: "HANDMADE", images: PH.carvedFigure, tags: ["home", "for-collectors", "under-1000"] },
      { title: "Wooden Serving Tray", desc: "Handle-cut serving tray, oiled finish.", price: 480, type: "HANDMADE", images: PH.carvedFigure, tags: ["home", "under-500"] },
    ],
  },

  // ---------- 25. Candles ----------
  {
    email: "ilawcandle@demo.atbp", name: "Cristina Bautista", username: "ilawcandleco",
    shopName: "Ilaw Candle Co.", handle: "ilawcandleco", category: "home-living",
    description: "Hand-poured soy candles in scents inspired by Filipino summers.",
    story: "Ilaw means 'light' — I wanted candles that actually smelled like home, not generic 'vanilla.'",
    province: "Cavite City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Sampaguita Soy Candle", desc: "Floral sampaguita scent, hand-poured in a glass jar.", price: 350, type: "HANDMADE", images: PH.coconutCandle, tags: ["home", "filipino-finds", "gifts", "under-500"] },
      { title: "Calamansi & Mint Candle", desc: "Bright citrus-mint blend, 35-hour burn time.", price: 380, type: "HANDMADE", images: PH.coconutCandle, tags: ["home", "gifts", "under-500"] },
      { title: "Candle Gift Set (3 Scents)", desc: "Mini trio set, great for gifting.", price: 750, type: "HANDMADE", images: PH.coconutCandle, tags: ["gifts", "housewarming-gifts", "under-1000"] },
      { title: "Coconut Shell Candle", desc: "Poured in a natural coconut shell, tropical scent.", price: 320, type: "HANDMADE", images: PH.coconutCandle, tags: ["filipino-finds", "under-500"] },
      { title: "Scented Wax Melts (Set of 6)", desc: "No-wick wax melts for oil burners.", price: 220, type: "HANDMADE", images: PH.coconutCandle, tags: ["home", "under-250"] },
    ],
  },

  // ---------- 26. Stickers / Enamel Pins ----------
  {
    email: "pinandpaper@demo.atbp", name: "Sofia Reyes", username: "pinandpaperco",
    shopName: "Pin & Paper Co.", handle: "pinandpaperco", category: "stationery",
    description: "Original enamel pins and vinyl stickers designed in-house.",
    story: "Doodled these designs in a notebook for years before finally turning them into actual products.",
    province: "Quezon City", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Enamel Pin (Original Design)", desc: "Hard enamel pin with butterfly clutch backing.", price: 180, type: "HANDMADE", images: PH.pinSticker, tags: ["cute-finds", "under-250"] },
      { title: "Vinyl Sticker Pack (10pc)", desc: "Waterproof vinyl stickers, laptop and bottle-ready.", price: 150, type: "HANDMADE", images: PH.pinSticker, tags: ["under-250", "cute-finds"] },
      { title: "Pin Collector Bundle (5pc)", desc: "Curated set of 5 enamel pins, gift-boxed.", price: 750, type: "HANDMADE", images: PH.pinSticker, tags: ["gifts", "for-collectors", "under-1000"] },
      { title: "Holographic Sticker Sheet", desc: "Shiny holographic finish, single large sheet.", price: 120, type: "HANDMADE", images: PH.pinSticker, tags: ["under-250", "cute-finds"] },
      { title: "Pin Display Board (Cork)", desc: "Cork board for displaying your pin collection.", price: 420, type: "HANDMADE", images: PH.pinSticker, tags: ["for-collectors", "under-500"] },
    ],
  },

  // ---------- 27. Vinyl / Music ----------
  {
    email: "groovemanila@demo.atbp", name: "Nico Fernandez", username: "groovemanila",
    shopName: "Groove Manila", handle: "groovemanila", category: "music",
    description: "Used vinyl records and music memorabilia for collectors and casual listeners alike.",
    story: "Inherited my dad's record collection, then couldn't stop hunting for more at every ukay-ukay.",
    province: "Manila City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "OPM Classic Vinyl (Used)", desc: "Original pressing, light surface noise, plays well.", price: 950, condition: "GOOD", type: "PRE_LOVED", images: PH.vinylRecords, tags: ["vintage-finds", "filipino-finds", "under-1000"] },
      { title: "Vintage Rock Vinyl Record", desc: "Classic rock album, sleeve shows wear.", price: 1200, condition: "FAIR", type: "VINTAGE", images: PH.vinylRecords, tags: ["vintage-finds", "for-collectors", "under-2500"] },
      { title: "Turntable Cleaning Kit", desc: "Brush and cleaning fluid for vinyl maintenance.", price: 380, type: "COLLECTIBLE", images: PH.vinylRecords, tags: ["for-collectors", "under-500"] },
      { title: "Vinyl Record Storage Crate", desc: "Wooden crate, holds up to 60 records.", price: 850, type: "COLLECTIBLE", images: PH.vinylRecords, tags: ["for-collectors", "under-1000"] },
      { title: "Used Jazz Compilation Vinyl", desc: "Classic jazz compilation, minor pops on side B.", price: 780, condition: "GOOD", type: "PRE_LOVED", images: PH.vinylRecords, tags: ["vintage-finds", "under-1000"] },
      { title: "Cassette Tape Bundle (5pc)", desc: "Mixed genre cassette tapes, all tested playable.", price: 450, condition: "GOOD", type: "VINTAGE", images: PH.vinylRecords, tags: ["vintage-finds", "under-500"] },
    ],
  },

  // ---------- 28. Cameras / Photography ----------
  {
    email: "shutterfilm@demo.atbp", name: "Leo Manalastas", username: "shutterandfilmph",
    shopName: "Shutter & Film PH", handle: "shutterandfilmph", category: "vintage",
    description: "Used film cameras, lenses, and darkroom gear for analog photography enthusiasts.",
    story: "Shot my first roll on a hand-me-down camera. Now I hunt for the same feeling to sell to others.",
    province: "Cebu City", tier: "TRUSTED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "35mm SLR Camera Body", desc: "Fully mechanical, light meter tested working.", price: 4200, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "for-collectors"] },
      { title: "Vintage Point-and-Shoot Camera", desc: "Compact film camera, tested with a roll.", price: 1800, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "under-2500"] },
      { title: "Camera Lens (50mm Prime, Used)", desc: "Manual focus prime lens, glass clear, no fungus.", price: 2800, condition: "EXCELLENT", type: "PRE_LOVED", images: PH.vintageCamera, tags: ["for-collectors", "worth-the-splurge"] },
      { title: "Film Roll Bundle (35mm, 5pc)", desc: "Fresh-dated color film, mixed ISO.", price: 950, type: "COLLECTIBLE", images: PH.vintageCamera, tags: ["under-1000"] },
      { title: "Camera Strap (Leather, Vintage-Style)", desc: "Genuine leather neck strap, adjustable length.", price: 650, type: "COLLECTIBLE", images: PH.vintageCamera, tags: ["gifts", "under-1000"] },
      { title: "Vintage Camera Bag", desc: "Canvas and leather bag, fits body plus two lenses.", price: 1200, condition: "GOOD", type: "VINTAGE", images: PH.vintageCamera, tags: ["vintage-finds", "under-2500"] },
    ],
  },

  // ---------- 29. Tech Accessories ----------
  {
    email: "gadgetworks@demo.atbp", name: "Ryan Tolentino", username: "gadgetworksph",
    shopName: "GadgetWorks PH", handle: "gadgetworksph", category: "tech",
    description: "Phone cases, chargers, and small tech accessories at honest prices.",
    story: "Got tired of overpriced mall kiosks, so I started sourcing and selling accessories myself.",
    province: "Makati City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Silicone Phone Case", desc: "Shock-absorbing silicone case, multiple colors.", price: 280, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["under-500"] },
      { title: "Fast Wireless Charger Pad", desc: "15W wireless charging pad, compact design.", price: 650, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["gifts-for-him", "under-1000"] },
      { title: "Leather Phone Case", desc: "PU leather flip case with card slots.", price: 450, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["under-500"] },
      { title: "USB-C Charging Cable (2m, Braided)", desc: "Durable braided cable, fast charging supported.", price: 220, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["under-250"] },
      { title: "Phone Ring Holder & Stand", desc: "360-degree rotating ring holder, adhesive back.", price: 150, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["under-250"] },
      { title: "Power Bank (10000mAh)", desc: "Slim power bank, dual USB output.", price: 850, type: "COLLECTIBLE", images: PH.phoneAccessories, tags: ["gifts-for-him", "under-1000"] },
    ],
  },

  // ---------- 30. Lego / Die-cast / Funko ----------
  {
    email: "brickblock@demo.atbp", name: "Oliver Yap", username: "brickandblockph",
    shopName: "Brick & Block PH", handle: "brickandblockph", category: "collectibles",
    description: "Brick sets, die-cast cars, and vinyl figures for the serious collector shelf.",
    story: "What began as a display shelf outgrew my apartment. Now I curate for other collectors too.",
    province: "Pasig City", tier: "TOP", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Die-Cast Sports Car (1:24 Scale)", desc: "Detailed die-cast model, opening doors and hood.", price: 1200, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["for-collectors", "gifts-for-him", "under-2500"] },
      { title: "Vinyl Figure (Pop Culture Icon)", desc: "Boxed vinyl figure, mint condition box.", price: 850, type: "COLLECTIBLE", images: PH.funko, tags: ["for-collectors", "under-1000"] },
      { title: "Brick Set (Vehicle Build, 500+ pieces)", desc: "Complete set, all pieces verified and bagged.", price: 2800, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["for-collectors", "gifts-for-kids", "under-2500"] },
      { title: "Die-Cast Classic Car Set (3pc)", desc: "Set of three vintage-style die-cast cars.", price: 950, type: "COLLECTIBLE", images: PH.animeFigure, tags: ["for-collectors", "under-1000"] },
      { title: "Vinyl Figure Display Case (6-Slot)", desc: "Acrylic case, protects figures from dust.", price: 550, type: "COLLECTIBLE", images: PH.funko, tags: ["for-collectors", "under-1000"] },
      { title: "Brick Mini-Figure Bundle (10pc)", desc: "Assorted mini-figures, compatible with major brick brands.", price: 650, type: "COLLECTIBLE", images: PH.toyFigure, tags: ["for-collectors", "gifts-for-kids", "under-1000"] },
      { title: "Robot Vinyl Figure (Limited Colorway)", desc: "Limited edition colorway, numbered box.", price: 1800, type: "COLLECTIBLE", images: PH.funko, tags: ["for-collectors", "worth-the-splurge"] },
    ],
  },

  // ---------- 31. Sports / Basketball Memorabilia ----------
  {
    email: "hoopsph@demo.atbp", name: "Julius Marquez", username: "hoopsphcollectibles",
    shopName: "Hoops PH Collectibles", handle: "hoopsphcollectibles", category: "collectibles",
    description: "Basketball jerseys, cards, and memorabilia for hoops fans.",
    story: "Just opened shop this year, sourcing jerseys and cards from local leagues and imports alike.",
    province: "Cagayan De Oro City", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Retro Basketball Jersey (Replica)", desc: "Screen-printed replica jersey, breathable mesh.", price: 950, type: "COLLECTIBLE", images: PH.basketballJersey, tags: ["for-collectors", "gifts-for-him", "under-1000"] },
      { title: "Basketball Trading Card Pack", desc: "Sealed pack, chance at rookie cards.", price: 280, type: "COLLECTIBLE", images: PH.basketballJersey, tags: ["for-collectors", "under-500"] },
      { title: "Signed Basketball (Replica Signature)", desc: "Display basketball with printed signature.", price: 1200, type: "COLLECTIBLE", images: PH.basketballJersey, tags: ["for-collectors", "under-2500"] },
      { title: "Vintage-Style Jersey (Throwback)", desc: "Throwback design, numbered on back.", price: 850, type: "COLLECTIBLE", images: PH.basketballJersey, tags: ["for-collectors", "under-1000"] },
      { title: "Jersey Display Frame", desc: "Shadow box frame for displaying jerseys.", price: 1500, type: "COLLECTIBLE", images: PH.basketballJersey, tags: ["for-collectors", "under-2500"] },
    ],
  },

  // ---------- 32. K-pop Collectibles ----------
  {
    email: "biaswrecker@demo.atbp", name: "Cherry Ann Domingo", username: "biaswreckerph",
    shopName: "Bias Wrecker PH", handle: "biaswreckerph", category: "collectibles",
    description: "K-pop albums, photocards, and merch for fellow stans.",
    story: "Started trading photocards in group chats. Now it's an actual shop with actual inventory.",
    province: "Manila City", tier: "TRUSTED", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "K-pop Album (Sealed, Random Ver.)", desc: "Sealed album with random photocard included.", price: 950, type: "COLLECTIBLE", images: PH.kpopMerch, tags: ["k-pop", "for-collectors", "under-1000"] },
      { title: "Photocard Binder (4-Pocket)", desc: "Compact binder for photocard collections.", price: 380, type: "COLLECTIBLE", images: PH.kpopMerch, tags: ["k-pop", "for-collectors", "under-500"] },
      { title: "Lightstick (Official-Style)", desc: "Concert lightstick with multiple light modes.", price: 1800, type: "COLLECTIBLE", images: PH.kpopMerch, tags: ["k-pop", "for-collectors", "worth-the-splurge"] },
      { title: "Photocard Sleeve Pack (50pc)", desc: "Protective sleeves sized for standard photocards.", price: 120, type: "COLLECTIBLE", images: PH.kpopMerch, tags: ["k-pop", "under-250"] },
      { title: "K-pop Merch Bundle (Keychain + Pin)", desc: "Fan merch bundle, unofficial fan-made design.", price: 350, type: "COLLECTIBLE", images: PH.kpopMerch, tags: ["k-pop", "gifts", "under-500"] },
    ],
  },

  // ---------- 33. Disney / Sanrio Collectibles ----------
  {
    email: "kawaiicorner@demo.atbp", name: "Michelle Uy", username: "kawaiicornermanila",
    shopName: "Kawaii Corner Manila", handle: "kawaiicornermanila", category: "collectibles",
    description: "Sanrio and Disney-inspired merch, plush, and stationery for the kawaii-obsessed.",
    story: "My room is basically a Sanrio museum at this point — might as well share the finds.",
    province: "Quezon City", tier: "ESTABLISHED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Kawaii Character Plush (Small)", desc: "Soft plush toy, iconic kawaii character design.", price: 480, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "toys-plush", "sanrio", "gifts-for-kids", "under-500"] },
      { title: "Kawaii Stamp Sheet Set", desc: "Sheet of collectible character stamps.", price: 220, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "sanrio", "under-250"] },
      { title: "Character Lunch Bag", desc: "Insulated lunch bag with kawaii character print.", price: 550, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "sanrio", "gifts-for-kids", "under-1000"] },
      { title: "Kawaii Sticker Book", desc: "Reusable sticker book, dozens of designs.", price: 280, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "sanrio", "under-500"] },
      { title: "Character Coin Purse", desc: "Cute coin purse with clasp closure.", price: 320, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "sanrio", "gifts", "under-500"] },
      { title: "Kawaii Mug (Character Print)", desc: "Ceramic mug with adorable character design.", price: 380, type: "COLLECTIBLE", images: PH.sanrio, tags: ["cute-finds", "sanrio", "gifts", "under-500"] },
    ],
  },

  // ---------- 34. Baby / Kids ----------
  {
    email: "munchkin@demo.atbp", name: "Angeline Perez", username: "munchkinmanila",
    shopName: "Munchkin Manila", handle: "munchkinmanila", category: "baby-kids",
    description: "Soft knit baby clothes and gentle essentials for new parents.",
    story: "Made my own baby's first sweater because nothing in stores felt soft enough. Started selling the extras.",
    province: "Pasig City", tier: "TRUSTED", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Knit Baby Sweater Set", desc: "Soft cotton-blend sweater and cap set, 0-6 months.", price: 550, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-1000"] },
      { title: "Baby Booties (Hand-Knit)", desc: "Warm knit booties, newborn size.", price: 280, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-500"] },
      { title: "Swaddle Blanket (Muslin Cotton)", desc: "Breathable muslin swaddle, generous size.", price: 420, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-500"] },
      { title: "Baby Milestone Blanket", desc: "Printed milestone blanket for monthly photos.", price: 480, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-500"] },
      { title: "Knit Baby Hat (Newborn)", desc: "Soft knit hat, gentle on newborn skin.", price: 220, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "under-250"] },
      { title: "Baby Gift Bundle (3pc)", desc: "Booties, hat, and blanket, boxed for gifting.", price: 950, type: "HANDMADE", images: PH.babyKnit, tags: ["gifts-for-kids", "gifts", "under-1000"] },
    ],
  },

  // ---------- 35. Pet Accessories ----------
  {
    email: "pawprints@demo.atbp", name: "Katrina Villamor", username: "pawprintsph",
    shopName: "Paw Prints PH", handle: "pawprintsph", category: "pets",
    description: "Collars, beds, and accessories for dogs and cats, made with real pet parents in mind.",
    story: "Started making things for my own rescue dogs. Turns out other pet parents wanted the same.",
    province: "Antipolo City", tier: "NEW", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Personalized Pet Collar", desc: "Adjustable collar with engraved name tag.", price: 380, type: "CUSTOM", images: PH.petAccessories, tags: ["personalized", "under-500"] },
      { title: "Pet Bed (Round, Washable Cover)", desc: "Cozy round bed, removable washable cover.", price: 850, type: "HANDMADE", images: PH.petAccessories, tags: ["under-1000"] },
      { title: "Cat Harness & Leash Set", desc: "Escape-resistant harness with matching leash.", price: 550, type: "HANDMADE", images: PH.petAccessories, tags: ["under-1000"] },
      { title: "Pet Bandana (Set of 3)", desc: "Reversible bandanas, adjustable snap closure.", price: 280, type: "HANDMADE", images: PH.petAccessories, tags: ["under-500", "cute-finds"] },
      { title: "Dog Travel Bowl (Collapsible)", desc: "Silicone collapsible bowl, clips onto bags.", price: 220, type: "HANDMADE", images: PH.petAccessories, tags: ["under-250"] },
    ],
  },

  // ---------- 36. Bags / Leather Goods ----------
  {
    email: "kalikasan@demo.atbp", name: "Roberto Cruz", username: "kalikasanleather",
    shopName: "Kalikasan Leather Co.", handle: "kalikasanleather", category: "bags",
    description: "Handmade leather bags and wallets from Marikina's shoe-and-leather tradition.",
    story: "Grew up around Marikina's leather workshops. Learned the trade, then started my own small line.",
    province: "Metro Manila", tier: "ESTABLISHED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "Full-Grain Leather Bifold Wallet", desc: "Hand-stitched, ages beautifully with use.", price: 950, type: "HANDMADE", images: PH.leatherBag, tags: ["gifts-for-him", "under-1000", "fathers-day-gifts"] },
      { title: "Leather Crossbody Bag", desc: "Compact crossbody, adjustable strap, brass hardware.", price: 1800, type: "HANDMADE", images: PH.leatherBag, tags: ["gifts-for-her", "under-2500"] },
      { title: "Leather Tote Bag (Large)", desc: "Spacious work tote, vegetable-tanned leather.", price: 2400, type: "HANDMADE", images: PH.leatherBag, tags: ["gifts-for-her", "worth-the-splurge"] },
      { title: "Personalized Leather Wallet", desc: "Hand-stamped initials on a bifold wallet.", price: 1050, type: "CUSTOM", images: PH.leatherBag, tags: ["personalized", "gifts-for-him", "under-2500"] },
      { title: "Leather Card Holder", desc: "Slim card holder, holds up to 6 cards.", price: 480, type: "HANDMADE", images: PH.leatherBag, tags: ["gifts-for-him", "under-500"] },
      { title: "Leather Belt (Handmade)", desc: "Full-grain leather belt, brass buckle.", price: 650, type: "HANDMADE", images: PH.leatherBag, tags: ["gifts-for-him", "under-1000"] },
    ],
  },

  // ---------- 37. Party / Wedding Supplies ----------
  {
    email: "fiestasupply@demo.atbp", name: "Ariel Mendoza", username: "fiestasupplyco",
    shopName: "Fiesta Supply Co.", handle: "fiestasupplyco", category: "party-wedding",
    description: "Party decor, wedding favors, and celebration essentials for every Filipino fiesta.",
    story: "Just started this year after helping plan one too many family fiestas myself.",
    province: "Bulacan", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Wedding Favor Boxes (Set of 20)", desc: "Elegant favor boxes, ribbon included.", price: 480, type: "HANDMADE", images: PH.weddingParty, tags: ["wedding-gifts", "under-500"] },
      { title: "Balloon Garland Kit", desc: "DIY balloon garland kit, 100+ pieces.", price: 650, type: "HANDMADE", images: PH.weddingParty, tags: ["under-1000"] },
      { title: "Personalized Wedding Guest Book", desc: "Custom cover with couple's names and date.", price: 850, type: "CUSTOM", images: PH.weddingParty, tags: ["personalized", "wedding-gifts", "under-1000"] },
      { title: "Fiesta Table Runner", desc: "Colorful woven-style table runner for celebrations.", price: 380, type: "HANDMADE", images: PH.weddingParty, tags: ["filipino-celebrations", "under-500"] },
      { title: "Birthday Party Decor Set", desc: "Banner, balloons, and confetti bundle.", price: 550, type: "HANDMADE", images: PH.weddingParty, tags: ["birthday-gifts", "under-1000"] },
      { title: "Wedding Welcome Sign (Personalized)", desc: "Custom wooden welcome sign with names.", price: 1200, type: "CUSTOM", images: PH.weddingParty, tags: ["personalized", "wedding-gifts", "under-2500"] },
    ],
  },

  // ---------- 38. Outdoor / Camping ----------
  {
    email: "basecamp@demo.atbp", name: "Ferdinand Rosales", username: "basecamptrailph",
    shopName: "Basecamp Trail PH", handle: "basecamptrailph", category: "outdoor",
    description: "Camping and trail gear for weekend hikers and overnighters.",
    story: "Started selling my own overstocked gear after one too many Baguio trips. Kept growing from there.",
    province: "Antipolo City", tier: "TRUSTED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "2-Person Dome Tent", desc: "Lightweight dome tent, packs down small, rainfly included.", price: 2800, type: "COLLECTIBLE", images: PH.campingGear, tags: ["for-homebodies", "worth-the-splurge"] },
      { title: "Folding Camp Chair", desc: "Compact folding chair with cup holder and carry bag.", price: 850, type: "COLLECTIBLE", images: PH.campingGear, tags: ["under-1000"] },
      { title: "Headlamp (Rechargeable)", desc: "USB-rechargeable headlamp, 3 brightness modes.", price: 450, type: "COLLECTIBLE", images: PH.campingGear, tags: ["gifts-for-him", "under-500"] },
      { title: "Camping Cookware Set", desc: "Compact nesting pot and pan set for backpacking.", price: 1200, type: "COLLECTIBLE", images: PH.campingGear, tags: ["under-2500"] },
      { title: "Sleeping Bag (3-Season)", desc: "Compression sack included, good to 10°C.", price: 1800, type: "COLLECTIBLE", images: PH.campingGear, tags: ["under-2500"] },
      { title: "Portable Camping Lantern", desc: "Collapsible LED lantern, battery or USB powered.", price: 380, type: "COLLECTIBLE", images: PH.campingGear, tags: ["under-500"] },
      { title: "Trail Backpack (40L)", desc: "Multi-compartment hiking backpack with rain cover.", price: 2200, type: "COLLECTIBLE", images: PH.campingGear, tags: ["gifts-for-him", "under-2500"] },
    ],
  },

  // ---------- 39. RC / Model Hobby ----------
  {
    email: "skylinerc@demo.atbp", name: "Paolo Vergara", username: "skylinerchobbies",
    shopName: "Skyline RC Hobbies", handle: "skylinerchobbies", category: "hobby-toys",
    description: "RC planes, model kits, and hobby-grade parts for builders.",
    story: "Flying RC planes on weekends turned into building and selling them for other hobbyists.",
    province: "Angeles City", tier: "TRUSTED", physicalPresence: "WORKSHOP", pickupAvailable: true,
    products: [
      { title: "RC Trainer Plane (RTF)", desc: "Ready-to-fly beginner RC plane, foam body.", price: 3200, type: "COLLECTIBLE", images: PH.rcModel, tags: ["for-collectors", "under-2500"] },
      { title: "Scale Model Airplane Kit", desc: "Wooden model kit, glue and tools not included.", price: 950, type: "COLLECTIBLE", images: PH.rcModel, tags: ["for-collectors", "under-1000"] },
      { title: "RC Battery Pack (LiPo)", desc: "High-capacity LiPo battery for RC models.", price: 650, type: "COLLECTIBLE", images: PH.rcModel, tags: ["for-collectors", "under-1000"] },
      { title: "Display Model Airplane (Finished)", desc: "Pre-built display model, no assembly required.", price: 1500, type: "COLLECTIBLE", images: PH.rcModel, tags: ["for-collectors", "under-2500"] },
      { title: "RC Transmitter (6-Channel)", desc: "Programmable transmitter for RC planes and cars.", price: 2800, type: "COLLECTIBLE", images: PH.rcModel, tags: ["for-collectors", "worth-the-splurge"] },
    ],
  },

  // ---------- 40. Fishing Gear ----------
  {
    email: "reeldeal@demo.atbp", name: "Bayani Custodio", username: "reeldealanglingph",
    shopName: "Reel Deal Angling PH", handle: "reeldealanglingph", category: "outdoor",
    description: "Rods, reels, and tackle for weekend anglers.",
    story: "Fishing every weekend with my dad since I was a kid — now I sell the gear we swear by.",
    province: "Cavite City", tier: "NEW", physicalPresence: "ONLINE_ONLY",
    products: [
      { title: "Spinning Reel (2000 Size)", desc: "Smooth drag spinning reel, saltwater resistant.", price: 1200, type: "COLLECTIBLE", images: PH.fishingGear, tags: ["gifts-for-him", "under-2500"] },
      { title: "Telescopic Fishing Rod", desc: "Compact telescopic rod, travels easily.", price: 850, type: "COLLECTIBLE", images: PH.fishingGear, tags: ["gifts-for-him", "under-1000"] },
      { title: "Tackle Box (Fully Stocked)", desc: "Pre-stocked tackle box with hooks, lures, and weights.", price: 650, type: "COLLECTIBLE", images: PH.fishingGear, tags: ["gifts-for-him", "under-1000"] },
      { title: "Fishing Lure Set (12pc)", desc: "Assorted lures for freshwater and light saltwater.", price: 380, type: "COLLECTIBLE", images: PH.fishingGear, tags: ["under-500"] },
      { title: "Fishing Line (Braided, 300m)", desc: "High-strength braided line, low stretch.", price: 280, type: "COLLECTIBLE", images: PH.fishingGear, tags: ["under-500"] },
    ],
  },

  // ---------- 41. Antique Curiosities ----------
  {
    email: "antiquenook@demo.atbp", name: "Corazon Espiritu", username: "antiquenookmanila",
    shopName: "Antique Nook Manila", handle: "antiquenookmanila", category: "antiques",
    description: "Curiosities, old furniture pieces, and estate finds for collectors of the unusual.",
    story: "Thirty years of estate sales later, I finally opened a proper shop for the pieces I couldn't let go to waste.",
    province: "Manila City", tier: "ESTABLISHED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Antique Brass Clock", desc: "Restored mechanical clock, working condition.", price: 2800, condition: "GOOD", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "for-collectors", "worth-the-splurge"] },
      { title: "Vintage Porcelain Figurine", desc: "Hand-painted porcelain piece, minor age marks.", price: 1500, condition: "FAIR", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "for-collectors"] },
      { title: "Antique Wooden Trunk", desc: "Restored travel trunk, functional latches.", price: 3500, condition: "GOOD", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "home", "worth-the-splurge"] },
      { title: "Old Wall Mirror (Ornate Frame)", desc: "Gilded frame mirror, some patina on the glass.", price: 1800, condition: "FAIR", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "home", "under-2500"] },
      { title: "Vintage Curio Cabinet Piece", desc: "Small decorative cabinet item, collector's piece.", price: 950, condition: "GOOD", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "for-collectors", "under-1000"] },
      { title: "Antique Book Collection (Set of 5)", desc: "Leather-bound antique books, shelf-display quality.", price: 1200, condition: "FAIR", type: "VINTAGE", images: PH.antiqueShop, tags: ["vintage-finds", "books", "under-2500"] },
    ],
  },

  // ---------- 42. DIY Craft Supplies ----------
  {
    email: "scrapstitch@demo.atbp", name: "Ligaya Ramos", username: "scrapandstitch",
    shopName: "Scrap & Stitch Supply", handle: "scrapandstitch", category: "handmade",
    description: "Fabric scraps, yarn, and craft supplies for DIY makers.",
    story: "Sold leftover fabric from my own sewing projects until it became a whole supply shop.",
    province: "Bulacan", tier: "NEW", physicalPresence: "HOME_STUDIO", pickupAvailable: true,
    products: [
      { title: "Fabric Scrap Bundle (1kg)", desc: "Mixed cotton scraps, great for quilting and patchwork.", price: 380, type: "HANDMADE", images: PH.crochet, tags: ["under-500"] },
      { title: "Yarn Bundle (Assorted Colors, 10pc)", desc: "Acrylic yarn skeins, beginner-friendly weight.", price: 450, type: "HANDMADE", images: PH.crochet, tags: ["under-500"] },
      { title: "Embroidery Starter Kit", desc: "Hoop, needles, thread, and pattern included.", price: 380, type: "HANDMADE", images: PH.crochet, tags: ["gifts", "under-500"] },
      { title: "Sewing Notions Bundle", desc: "Buttons, zippers, and trims assortment.", price: 280, type: "HANDMADE", images: PH.crochet, tags: ["under-500"] },
      { title: "Craft Glue Gun & Sticks Set", desc: "Mini glue gun with 20 glue sticks.", price: 220, type: "HANDMADE", images: PH.stationery, tags: ["under-250"] },
    ],
  },

  // ---------- 43. General Thrift ----------
  {
    email: "ukayrack@demo.atbp", name: "Norma Delgado", username: "ukayrackph",
    shopName: "Ukay Rack PH", handle: "ukayrackph", category: "pre-loved",
    description: "Mixed thrift finds — clothing, bags, and household items, all inspected before listing.",
    story: "Been running an ukay rack at the local tiangge for a decade. Figured it was time to go online too.",
    province: "Cebu City", tier: "TRUSTED", physicalPresence: "PHYSICAL_STORE", pickupAvailable: true,
    products: [
      { title: "Thrifted Flannel Shirt", desc: "Soft cotton flannel, unisex medium.", price: 350, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["fashion", "under-500"] },
      { title: "Pre-Loved Handbag", desc: "Structured handbag, minor wear on corners.", price: 650, condition: "GOOD", type: "PRE_LOVED", images: PH.leatherBag, tags: ["fashion", "under-1000"] },
      { title: "Thrifted Ceramic Tableware Set", desc: "Mismatched but charming plate set, 6 pieces.", price: 450, condition: "GOOD", type: "PRE_LOVED", images: PH.ceramicBowls, tags: ["home", "under-500"] },
      { title: "Pre-Loved Kids Jacket", desc: "Gently used kids jacket, size 6-7.", price: 280, condition: "GOOD", type: "PRE_LOVED", images: PH.denimJacket, tags: ["gifts-for-kids", "under-500"] },
      { title: "Thrifted Leather Belt", desc: "Genuine leather, classic buckle.", price: 220, condition: "GOOD", type: "PRE_LOVED", images: PH.leatherBag, tags: ["under-250"] },
      { title: "Pre-Loved Throw Blanket", desc: "Soft throw blanket, washed and sanitized.", price: 380, condition: "GOOD", type: "PRE_LOVED", images: PH.crochet, tags: ["home", "under-500"] },
    ],
  },
];
