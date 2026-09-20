"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Gavel, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { createProductAction, updateProductAction, type ProductInput } from "@/lib/actions/products";
import { PRODUCT_TYPES, CONDITIONS, conditionDefinition } from "@/lib/constants";
import { ImageUploader } from "@/components/domain/image-uploader";
import { VideoUploader } from "@/components/domain/video-uploader";
import { cn } from "@/lib/utils";
import { AUCTIONS_ENABLED } from "@/lib/feature-flags";

interface Category {
  id: string;
  name: string;
  icon: string;
}

function toLocalInputValue(d?: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function ProductForm({
  categories,
  productId,
  initial,
  sellerLocalDeliveryAreas = [],
}: {
  categories: Category[];
  productId?: string;
  initial?: Partial<ProductInput>;
  sellerLocalDeliveryAreas?: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [videoUrl, setVideoUrl] = useState<string | null>(initial?.videoUrl ?? null);
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compareAtPrice?.toString() ?? "");
  const [quantity, setQuantity] = useState(initial?.quantity?.toString() ?? "1");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? categories[0]?.id ?? "");
  const [type, setType] = useState(initial?.type ?? "HANDMADE");
  const [condition, setCondition] = useState(initial?.condition ?? "BRAND_NEW");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [shippingInfo, setShippingInfo] = useState(initial?.shippingInfo ?? "Ships via J&T Express or LBC.");
  const [shippingAvailable, setShippingAvailable] = useState(initial?.shippingAvailable ?? true);
  const [pickupAvailable, setPickupAvailable] = useState(initial?.pickupAvailable ?? false);
  const [localDeliveryAvailable, setLocalDeliveryAvailable] = useState(initial?.localDeliveryAvailable ?? false);
  const [localDeliveryAreas, setLocalDeliveryAreas] = useState<string[]>(initial?.localDeliveryAreas ?? []);
  const [publish, setPublish] = useState((initial?.status ?? "ACTIVE") !== "DRAFT");
  const [loading, setLoading] = useState(false);

  const [isDigital, setIsDigital] = useState(initial?.isDigital ?? false);
  const [digitalFileUrl, setDigitalFileUrl] = useState(initial?.digitalFileUrl ?? "");
  const [digitalDeliveryInstructions, setDigitalDeliveryInstructions] = useState(initial?.digitalDeliveryInstructions ?? "");

  const [madeToOrder, setMadeToOrder] = useState(initial?.madeToOrder ?? false);
  const [productionTimeDays, setProductionTimeDays] = useState(initial?.productionTimeDays?.toString() ?? "");
  const [customizationOptions, setCustomizationOptions] = useState((initial?.customizationOptions ?? []).join(", "));
  const [personalizationInstructions, setPersonalizationInstructions] = useState(initial?.personalizationInstructions ?? "");
  const [maxOrderQuantity, setMaxOrderQuantity] = useState(initial?.maxOrderQuantity?.toString() ?? "");

  const [isFood, setIsFood] = useState(initial?.isFood ?? false);
  const [shelfStable, setShelfStable] = useState(initial?.shelfStable ?? false);
  const [expiryInfo, setExpiryInfo] = useState(initial?.expiryInfo ?? "");
  const [ingredients, setIngredients] = useState(initial?.ingredients ?? "");
  const [allergens, setAllergens] = useState(initial?.allergens ?? "");
  const [foodShippingNotes, setFoodShippingNotes] = useState(initial?.foodShippingNotes ?? "");

  // Selling method — only choosable at creation; auctions can't be edited afterwards.
  const [listingType, setListingType] = useState<"FIXED" | "AUCTION">((initial?.listingType as "FIXED" | "AUCTION") ?? "FIXED");
  const [startingBid, setStartingBid] = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [buyNowPrice, setBuyNowPrice] = useState("");
  const [minIncrement, setMinIncrement] = useState("50");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");

  // Deal scheduling (fixed-price listings only).
  const [dealEnabled, setDealEnabled] = useState(!!initial?.dealPrice);
  const [dealPrice, setDealPrice] = useState(initial?.dealPrice?.toString() ?? "");
  const [dealStartAt, setDealStartAt] = useState(toLocalInputValue(initial?.dealStartAt));
  const [dealEndAt, setDealEndAt] = useState(toLocalInputValue(initial?.dealEndAt));

  const isAuction = listingType === "AUCTION";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isAuction && (!startingBid || !endAt)) {
      toast.error("Set a starting bid and an end date/time for the auction.");
      return;
    }
    if (isAuction && startAt && new Date(startAt) >= new Date(endAt)) {
      toast.error("The auction must start before it ends.");
      return;
    }
    if (dealEnabled && !dealPrice) {
      toast.error("Set a sale price for the deal, or turn the deal off.");
      return;
    }
    if (!isDigital && !shippingAvailable && !pickupAvailable && !localDeliveryAvailable) {
      toast.error("Turn on at least one way for buyers to get this item.");
      return;
    }
    if (isDigital && !digitalFileUrl) {
      toast.error("Add a digital file link buyers will receive after purchase.");
      return;
    }

    const payload: ProductInput = {
      title,
      description,
      images,
      videoUrl,
      price: isAuction ? Number(startingBid) : Number(price),
      compareAtPrice: !isAuction && compareAtPrice ? Number(compareAtPrice) : null,
      quantity: Number(quantity),
      categoryId,
      type,
      condition,
      sku,
      shippingInfo,
      sellingModes: isAuction ? ["AUCTION"] : ["BUY_NOW"],
      status: publish ? "ACTIVE" : "DRAFT",
      listingType,
      auction: isAuction
        ? {
            startingBid: Number(startingBid),
            reservePrice: reservePrice ? Number(reservePrice) : null,
            buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
            minIncrement: Number(minIncrement) || 50,
            startAt: startAt ? new Date(startAt).toISOString() : null,
            endAt: new Date(endAt).toISOString(),
          }
        : null,
      dealPrice: !isAuction && dealEnabled ? Number(dealPrice) : null,
      dealStartAt: !isAuction && dealEnabled && dealStartAt ? new Date(dealStartAt).toISOString() : null,
      dealEndAt: !isAuction && dealEnabled && dealEndAt ? new Date(dealEndAt).toISOString() : null,
      shippingAvailable,
      pickupAvailable,
      localDeliveryAvailable,
      localDeliveryAreas: localDeliveryAvailable && localDeliveryAreas.length ? localDeliveryAreas : null,
      isDigital,
      digitalFileUrl: isDigital ? digitalFileUrl : null,
      digitalDeliveryInstructions: isDigital ? digitalDeliveryInstructions : null,
      madeToOrder,
      productionTimeDays: madeToOrder && productionTimeDays ? Number(productionTimeDays) : null,
      customizationOptions: madeToOrder
        ? customizationOptions.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      personalizationInstructions: madeToOrder ? personalizationInstructions : null,
      maxOrderQuantity: maxOrderQuantity ? Number(maxOrderQuantity) : null,
      isFood,
      shelfStable: isFood ? shelfStable : false,
      expiryInfo: isFood ? expiryInfo : null,
      ingredients: isFood ? ingredients : null,
      allergens: isFood ? allergens : null,
      foodShippingNotes: isFood ? foodShippingNotes : null,
    };

    setLoading(true);
    const res = productId ? await updateProductAction(productId, payload) : await createProductAction(payload);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(productId ? "Product updated" : "Product created");
    router.push(isAuction ? "/studio/auctions" : "/studio/products");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label>Product name</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label>Photos</Label>
        <ImageUploader value={images} onChange={setImages} max={8} label="Add photo" />
        <p className="text-xs text-ink-400">Leave blank to use a placeholder image. Drag photos to reorder: the first one is the cover shown everywhere.</p>
      </div>

      <div className="space-y-1.5">
        <Label>Video (optional)</Label>
        <VideoUploader value={videoUrl} onChange={setVideoUrl} />
        <p className="text-xs text-ink-400">Shows on the product page below the photos. MP4, WebM, or MOV, up to 50MB.</p>
      </div>

      {!productId && AUCTIONS_ENABLED && (
        <div className="space-y-2">
          <Label>How are you selling this?</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setListingType("FIXED")}
              className={cn(
                "flex items-center gap-2 rounded-2xl border p-3 text-left transition-colors",
                !isAuction ? "border-brand-500 bg-brand-50" : "border-ink-200"
              )}
            >
              <TagIcon size={16} className="text-brand-600" />
              <div>
                <p className="text-sm font-bold text-ink-900">Buy Now</p>
                <p className="text-xs text-ink-500">Fixed price, optional deal</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setListingType("AUCTION")}
              className={cn(
                "flex items-center gap-2 rounded-2xl border p-3 text-left transition-colors",
                isAuction ? "border-brand-500 bg-brand-50" : "border-ink-200"
              )}
            >
              <Gavel size={16} className="text-brand-600" />
              <div>
                <p className="text-sm font-bold text-ink-900">Auction</p>
                <p className="text-xs text-ink-500">Buyers bid, highest wins</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {isAuction ? (
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-ink-200 p-4">
          <div className="col-span-2 space-y-1.5">
            <Label>Starting bid (₱)</Label>
            <Input type="number" min={1} value={startingBid} onChange={(e) => setStartingBid(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Reserve price (₱, optional)</Label>
            <Input type="number" min={0} value={reservePrice} onChange={(e) => setReservePrice(e.target.value)} placeholder="No reserve" />
          </div>
          <div className="space-y-1.5">
            <Label>Minimum bid increment (₱)</Label>
            <Input type="number" min={1} value={minIncrement} onChange={(e) => setMinIncrement(e.target.value)} />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Buy It Now price (₱, optional)</Label>
            <Input type="number" min={0} value={buyNowPrice} onChange={(e) => setBuyNowPrice(e.target.value)} placeholder="Let buyers skip bidding and pay this to win instantly" />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Starts (optional)</Label>
            <Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} placeholder="Starts immediately" />
            <p className="text-xs text-ink-500">Schedule it for later and it&apos;ll appear under &quot;Starting Soon&quot; until then. Leave blank to start right away.</p>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Auction ends</Label>
            <Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required />
          </div>
          <p className="col-span-2 text-xs text-ink-500">
            Auction listings are one-of-one and can&apos;t be edited once created. End early from Studio &gt; Auctions if needed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Price (₱)</Label>
            <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>Compare-at price (₱)</Label>
            <Input type="number" min={0} value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} />
          </div>
        </div>
      )}

      {!isAuction && (
        <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">Run a deal</p>
              <p className="text-xs text-ink-500">Schedule a discount window: it activates and ends automatically.</p>
            </div>
            <Button type="button" size="sm" variant={dealEnabled ? "brand" : "outline"} onClick={() => setDealEnabled((v) => !v)}>
              {dealEnabled ? "On" : "Off"}
            </Button>
          </div>
          {dealEnabled && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Sale price (₱)</Label>
                <Input type="number" min={0} value={dealPrice} onChange={(e) => setDealPrice(e.target.value)} required={dealEnabled} />
              </div>
              <div className="space-y-1.5">
                <Label>Starts (optional)</Label>
                <Input type="datetime-local" value={dealStartAt} onChange={(e) => setDealStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Ends (optional)</Label>
                <Input type="datetime-local" value={dealEndAt} onChange={(e) => setDealEndAt(e.target.value)} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Condition</Label>
          <Select value={condition} onValueChange={setCondition}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value} title={c.definition}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-ink-400">{conditionDefinition(condition)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Item type</Label>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {PRODUCT_TYPES.map((t) => (
            <button
              type="button"
              key={t.value}
              onClick={() => setType(t.value)}
              className={cn(
                "rounded-2xl border p-2.5 text-center text-xs font-semibold transition-colors",
                type === t.value ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600"
              )}
            >
              <span className="block text-lg">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!isAuction && (
        <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">Digital download</p>
              <p className="text-xs text-ink-500">No shipping: buyers get a file or link right after purchase.</p>
            </div>
            <Switch checked={isDigital} onCheckedChange={setIsDigital} />
          </div>
          {isDigital && (
            <div className="space-y-3 border-t border-ink-100 pt-3">
              <div className="space-y-1.5">
                <Label>Digital file link</Label>
                <Input value={digitalFileUrl} onChange={(e) => setDigitalFileUrl(e.target.value)} placeholder="https://..." required={isDigital} />
              </div>
              <div className="space-y-1.5">
                <Label>Delivery instructions (optional)</Label>
                <Textarea value={digitalDeliveryInstructions} onChange={(e) => setDigitalDeliveryInstructions(e.target.value)} placeholder="What buyers should expect and how to use the file" />
              </div>
            </div>
          )}
        </div>
      )}

      {!isAuction && (
        <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">Made to order</p>
              <p className="text-xs text-ink-500">You produce this after each order instead of shipping from stock.</p>
            </div>
            <Switch checked={madeToOrder} onCheckedChange={setMadeToOrder} />
          </div>
          {madeToOrder && (
            <div className="grid grid-cols-2 gap-3 border-t border-ink-100 pt-3">
              <div className="space-y-1.5">
                <Label>Production time (days)</Label>
                <Input type="number" min={1} value={productionTimeDays} onChange={(e) => setProductionTimeDays(e.target.value)} placeholder="e.g. 5" />
              </div>
              <div className="space-y-1.5">
                <Label>Max order quantity</Label>
                <Input type="number" min={1} value={maxOrderQuantity} onChange={(e) => setMaxOrderQuantity(e.target.value)} placeholder="No limit" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Customization options</Label>
                <Input value={customizationOptions} onChange={(e) => setCustomizationOptions(e.target.value)} placeholder="Color, Size, Text on tag (comma-separated)" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Personalization instructions for buyers (optional)</Label>
                <Textarea value={personalizationInstructions} onChange={(e) => setPersonalizationInstructions(e.target.value)} placeholder="What info you need from the buyer to make this" />
              </div>
            </div>
          )}
        </div>
      )}

      {!isAuction && (
        <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-ink-900">Snacks & Pasalubong details</p>
              <p className="text-xs text-ink-500">Shelf-stable packaged food, not fresh or hot food delivery.</p>
            </div>
            <Switch checked={isFood} onCheckedChange={setIsFood} />
          </div>
          {isFood && (
            <div className="space-y-3 border-t border-ink-100 pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-ink-800">Shelf-stable</p>
                  <p className="text-xs text-ink-500">Doesn&apos;t need refrigeration and keeps for weeks or months.</p>
                </div>
                <Switch checked={shelfStable} onCheckedChange={setShelfStable} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry / best-before info</Label>
                <Input value={expiryInfo} onChange={(e) => setExpiryInfo(e.target.value)} placeholder="e.g. Best consumed within 3 months of purchase" />
              </div>
              <div className="space-y-1.5">
                <Label>Ingredients</Label>
                <Textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="List the ingredients buyers should know about" />
              </div>
              <div className="space-y-1.5">
                <Label>Allergens</Label>
                <Input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="e.g. Contains peanuts, milk, gluten" />
              </div>
              <div className="space-y-1.5">
                <Label>Shipping notes (optional)</Label>
                <Textarea value={foodShippingNotes} onChange={(e) => setFoodShippingNotes(e.target.value)} placeholder="Any shipping restrictions or packaging notes for this food item" />
              </div>
            </div>
          )}
        </div>
      )}

      {!isDigital && (
      <div className="space-y-3 rounded-2xl border border-ink-200 p-4">
        <p className="text-sm font-bold text-ink-900">How can buyers get this?</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink-800">Ship nationwide</p>
            <p className="text-xs text-ink-500">Delivered via courier anywhere in the Philippines.</p>
          </div>
          <Switch checked={shippingAvailable} onCheckedChange={setShippingAvailable} />
        </div>
        {shippingAvailable && (
          <div className="space-y-1.5 pl-1">
            <Label>Shipping information</Label>
            <Input value={shippingInfo} onChange={(e) => setShippingInfo(e.target.value)} />
          </div>
        )}
        <div className="flex items-center justify-between border-t border-ink-100 pt-3">
          <div>
            <p className="text-sm font-medium text-ink-800">Store pickup</p>
            <p className="text-xs text-ink-500">Buyers near you can arrange to pick this up in person. Exact pickup details are only shared after an order is placed.</p>
          </div>
          <Switch checked={pickupAvailable} onCheckedChange={setPickupAvailable} />
        </div>
        <div className="flex items-center justify-between border-t border-ink-100 pt-3">
          <div>
            <p className="text-sm font-medium text-ink-800">Local delivery</p>
            <p className="text-xs text-ink-500">You deliver this yourself to buyers in your delivery areas (set under Local Delivery in Shop Settings).</p>
          </div>
          <Switch checked={localDeliveryAvailable} onCheckedChange={setLocalDeliveryAvailable} />
        </div>
        {localDeliveryAvailable && (
          <div className="space-y-2 border-t border-ink-100 pt-3 pl-1">
            {sellerLocalDeliveryAreas.length > 0 ? (
              <>
                <Label>Deliver this item to (optional)</Label>
                <p className="text-xs text-ink-500">
                  Leave all unselected to deliver anywhere in your usual areas. Pick specific ones to narrow just this item, handy for something perishable, fragile, or too bulky to send as far.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {sellerLocalDeliveryAreas.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() =>
                        setLocalDeliveryAreas((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                        localDeliveryAreas.includes(area) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-ink-200 bg-white text-ink-600"
                      )}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-500">
                Set up your delivery areas under Studio &gt; Shop Settings &gt; Local Delivery first. You&apos;ll be able to narrow individual items down once you have.
              </p>
            )}
          </div>
        )}
      </div>
      )}

      {!isDigital && !shippingAvailable && !localDeliveryAvailable && pickupAvailable && (
        <p className="-mt-2 text-xs text-ink-500 pl-1">
          Pickup-only: good for bulky items like furniture or nipa huts that can&apos;t go through a courier.
        </p>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-ink-200 p-3.5">
        <div>
          <p className="text-sm font-bold text-ink-900">{publish ? "Published" : "Draft"}</p>
          <p className="text-xs text-ink-500">{publish ? "Visible to buyers on ATBP." : "Hidden until you publish it."}</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant={publish ? "subtle" : "brand"} onClick={() => setPublish(false)}>Save as draft</Button>
          <Button type="button" size="sm" variant={publish ? "brand" : "subtle"} onClick={() => setPublish(true)}>Publish</Button>
        </div>
      </div>

      <Button type="submit" variant="brand" size="lg" disabled={loading}>
        {loading ? "Saving..." : productId ? "Save Changes" : publish ? "Publish Listing" : "Save Draft"}
      </Button>
    </form>
  );
}
