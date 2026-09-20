// Additive category seed for ATBP Services (Part A: Services, Part B: Digital
// Products) — safe to run against the live DB since it only creates new
// Category rows, never touches existing ones. Mirrors the exact leaf list
// and CATEGORY_GROUPS entries added to prisma/seed.ts, so a future full
// reseed produces the same categories.
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const LEAVES = [
  { name: "Graphic Design", slug: "graphic-design", icon: "🖌️" },
  { name: "Logo & Brand Identity", slug: "logo-brand-identity", icon: "🏷️" },
  { name: "Illustration & Art Commissions", slug: "illustration-art-commissions", icon: "🎨" },
  { name: "Character Design & VTuber Models", slug: "character-design-vtuber", icon: "🧑‍🎤" },
  { name: "Animation & Motion Graphics", slug: "animation-motion-graphics", icon: "🎞️" },
  { name: "UI/UX Design", slug: "ui-ux-design", icon: "📐" },
  { name: "Presentation & Pitch Deck Design", slug: "pitch-deck-design", icon: "📊" },
  { name: "Tattoo Design", slug: "tattoo-design", icon: "🖋️" },
  { name: "3D Modeling & CAD", slug: "3d-modeling-cad", icon: "🧊" },
  { name: "Web Development", slug: "web-development", icon: "💻" },
  { name: "App Development & Bug Fixes", slug: "app-development", icon: "📱" },
  { name: "Chatbot & Automation Setup", slug: "chatbot-automation", icon: "🤖" },
  { name: "SEO & Ads Setup", slug: "seo-ads-setup", icon: "📈" },
  { name: "Video Editing", slug: "video-editing", icon: "🎬" },
  { name: "Short-Form & Reels Editing", slug: "reels-editing", icon: "📲" },
  { name: "Music Production & Custom Songs", slug: "music-production", icon: "🎵" },
  { name: "Jingles", slug: "jingles", icon: "🎶" },
  { name: "Voice-Over & Dubbing", slug: "voice-over-dubbing", icon: "🎙️" },
  { name: "Podcast Editing", slug: "podcast-editing", icon: "🎧" },
  { name: "Copywriting", slug: "copywriting", icon: "✍️" },
  { name: "Translation & Localization", slug: "translation-localization", icon: "🌐" },
  { name: "Transcription & Subtitling", slug: "transcription-subtitling", icon: "📝" },
  { name: "Resume/CV & LinkedIn", slug: "resume-linkedin", icon: "📄" },
  { name: "Virtual Assistant", slug: "virtual-assistant", icon: "🗂️" },
  { name: "Data Entry & Web Research", slug: "data-entry-research", icon: "🔍" },
  { name: "Social Media Management", slug: "social-media-management", icon: "📣" },
  { name: "Academic Tutoring", slug: "academic-tutoring", icon: "📚" },
  { name: "Language Lessons", slug: "language-lessons", icon: "🗣️" },
  { name: "Music & Art Lessons", slug: "music-art-lessons", icon: "🎹" },
  { name: "Coding Lessons", slug: "coding-lessons", icon: "👨‍💻" },
  { name: "Skill Coaching", slug: "skill-coaching", icon: "🎯" },
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

const GROUPS = [
  {
    name: "Services", slug: "services", icon: "💼",
    children: [
      "graphic-design", "logo-brand-identity", "illustration-art-commissions", "character-design-vtuber", "animation-motion-graphics", "ui-ux-design", "pitch-deck-design", "tattoo-design",
      "3d-modeling-cad", "web-development", "app-development", "chatbot-automation", "seo-ads-setup",
      "video-editing", "reels-editing", "music-production", "jingles", "voice-over-dubbing", "podcast-editing",
      "copywriting", "translation-localization", "transcription-subtitling", "resume-linkedin", "virtual-assistant", "data-entry-research", "social-media-management",
      "academic-tutoring", "language-lessons", "music-art-lessons", "coding-lessons", "skill-coaching",
    ],
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

(async () => {
  const maxOrder = await prisma.category.aggregate({ _max: { order: true } });
  let order = (maxOrder._max.order ?? 0) + 1;

  const bySlug = {};
  for (const leaf of LEAVES) {
    const existing = await prisma.category.findUnique({ where: { slug: leaf.slug } });
    if (existing) { bySlug[leaf.slug] = existing; continue; }
    bySlug[leaf.slug] = await prisma.category.create({ data: { ...leaf, order: order++ } });
  }
  console.log(`Leaf categories ready: ${Object.keys(bySlug).length}`);

  for (const group of GROUPS) {
    let parent = await prisma.category.findUnique({ where: { slug: group.slug } });
    if (!parent) {
      parent = await prisma.category.create({ data: { name: group.name, slug: group.slug, icon: group.icon, order: order++ } });
      console.log(`Created parent category: ${group.name}`);
    }
    for (let j = 0; j < group.children.length; j++) {
      const child = bySlug[group.children[j]];
      if (child) await prisma.category.update({ where: { id: child.id }, data: { parentId: parent.id, order: j } });
    }
  }
  console.log("Done.");
  await prisma.$disconnect();
})();
