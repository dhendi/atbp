// Deals are a scheduled discount window on a product, not a mutable "sale price"
// field a seller edits directly at checkout time — everything here is derived
// at read time from price/dealPrice/dealStartAt/dealEndAt, so a deal activates
// and expires automatically as the clock passes those dates.

interface DealFields {
  price: number;
  dealPrice?: number | null;
  dealStartAt?: Date | string | null;
  dealEndAt?: Date | string | null;
}

export function isDealActive(product: DealFields): boolean {
  if (!product.dealPrice || product.dealPrice >= product.price) return false;
  const now = Date.now();
  if (product.dealStartAt && now < new Date(product.dealStartAt).getTime()) return false;
  if (product.dealEndAt && now > new Date(product.dealEndAt).getTime()) return false;
  return true;
}

export function isDealScheduled(product: DealFields): boolean {
  if (!product.dealPrice || product.dealPrice >= product.price) return false;
  return !!product.dealStartAt && Date.now() < new Date(product.dealStartAt).getTime();
}

export function effectivePrice(product: DealFields): number {
  return isDealActive(product) ? (product.dealPrice as number) : product.price;
}

export function discountPercent(product: DealFields): number {
  if (!product.dealPrice || product.dealPrice >= product.price) return 0;
  return Math.round(((product.price - product.dealPrice) / product.price) * 100);
}

export function discountAmount(product: DealFields): number {
  if (!product.dealPrice || product.dealPrice >= product.price) return 0;
  return product.price - product.dealPrice;
}
