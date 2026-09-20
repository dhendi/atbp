const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

(async () => {
  const targets = await prisma.product.findMany({
    where: { OR: [{ closetId: { not: null } }, { yardSale: { isNot: null } }], status: "ACTIVE" },
    select: { id: true, title: true, price: true },
  });
  console.log("Eligible Closet/Yard Sale ACTIVE products:", targets.length);
  let updated = 0;
  for (const p of targets) {
    const floor = Math.max(20, Math.round((p.price * 0.7) / 5) * 5);
    await prisma.product.update({
      where: { id: p.id },
      data: { tawadEnabled: true, tawadFloor: floor, tawadCeiling: null },
    });
    updated++;
  }
  console.log("Updated:", updated);
  await prisma.$disconnect();
})();
