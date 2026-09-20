import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function csvCell(value: string | number) {
  let s = String(value);
  // Neutralize formula injection — a cell starting with =, +, -, or @ can
  // execute as a formula when the file is opened in Excel/Sheets. Buyer
  // names and item titles here are user-controlled text, not our own data.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return NextResponse.json({ error: "Not authorized." }, { status: 401 });

  const orders = await prisma.order.findMany({
    where: { sellerId: seller.id },
    include: { buyer: true, items: true, shipment: true },
    orderBy: { createdAt: "desc" },
  });

  const header = [
    "Order Number", "Date", "Buyer", "Status", "Payment Method", "Payment Status",
    "Items", "Subtotal", "Shipping Fee", "Discount", "Total", "Tracking Number", "Courier",
  ];
  const rows = orders.map((o) => [
    o.orderNumber,
    o.createdAt.toISOString(),
    o.buyer?.name ?? `${o.guestEmail} (guest)`,
    o.status,
    o.paymentMethod,
    o.paymentStatus,
    o.items.map((i) => `${i.title} x${i.quantity}`).join("; "),
    o.subtotal.toFixed(2),
    o.shippingFee.toFixed(2),
    o.discountAmount.toFixed(2),
    o.total.toFixed(2),
    o.shipment?.trackingNumber ?? "",
    o.shipment?.courierName ?? "",
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="atbp-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
