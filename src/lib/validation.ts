import { z } from "zod";
import { ID_DOCUMENT_TYPES } from "@/lib/constants";
import { isBlobUrlUnder, ID_DOCUMENT_BLOB_PREFIX } from "@/lib/safe-url";

/** Shared runtime-validation schemas for server actions that take free-form
 * user input. Compile-time types don't stop a crafted request from sending
 * `rating: 99999` or a 500KB comment — these do. Use `firstIssue()` to turn a
 * failed `safeParse` into the same `{ error: string }` shape actions already
 * return, so call sites don't need a new error-handling path. */

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1 and 5").max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(2000, "Review is too long (2000 characters max)"),
});

export const sellerResponseSchema = z.string().trim().min(1, "Write a response first.").max(1000, "Response is too long (1000 characters max)");

const ID_DOCUMENT_TYPE_VALUES = ID_DOCUMENT_TYPES.map((t) => t.value) as [string, ...string[]];

/** Every seller onboarding path requires this, regardless of casual vs.
 * business — see idVerificationBlockMessage in lib/constants.ts for how an
 * unverified ID affects new listings after signup. */
export const sellerIdVerificationInputSchema = z.object({
  idDocumentType: z.enum(ID_DOCUMENT_TYPE_VALUES, { message: "Choose the type of ID you're uploading." }),
  idDocumentUrl: z.string().trim().min(1, "Upload a photo of your ID before continuing.").refine((v) => isBlobUrlUnder(v, ID_DOCUMENT_BLOB_PREFIX), "That ID upload isn't valid. Please upload it again."),
  selfiePhotoUrl: z.string().trim().min(1, "Take a live selfie before continuing.").refine((v) => isBlobUrlUnder(v, ID_DOCUMENT_BLOB_PREFIX), "That selfie upload isn't valid. Please take it again."),
});

/** Business sellers only — the actual BIR Certificate of Registration
 * document, not just the typed registration number. */
export const businessLicenseInputSchema = z.string().trim().min(1, "Upload your BIR Certificate of Registration before continuing.").refine((v) => isBlobUrlUnder(v, ID_DOCUMENT_BLOB_PREFIX), "That document upload isn't valid. Please upload it again.");

export const shippingInfoSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  phone: z.string().trim().min(1, "Enter a phone number").max(20),
  address: z.string().trim().min(1, "Enter an address").max(300),
  city: z.string().trim().min(1, "Enter a city").max(120),
  province: z.string().trim().min(1, "Enter a province").max(120),
  postalCode: z.string().trim().min(1, "Enter a postal code").max(12),
});

export const disputeInputSchema = z.object({
  reason: z.string().trim().min(1, "Select a reason").max(200),
  details: z.string().trim().min(1, "Add details about the issue").max(3000, "Details are too long (3000 characters max)"),
});

export const messageContentSchema = z.string().trim().min(1, "Message can't be empty").max(4000, "Message is too long (4000 characters max)");

export const productMoneySchema = z
  .number()
  .finite("Enter a valid amount")
  .positive("Price must be greater than 0")
  .max(10_000_000, "Price is too high");

export const productTitleSchema = z.string().trim().min(1, "Enter a title").max(140, "Title is too long (140 characters max)");
export const productDescriptionSchema = z.string().trim().max(5000, "Description is too long (5000 characters max)");

/** compareAtPrice/dealPrice/reservePrice/buyNowPrice etc — same bound as
 * productMoneySchema, just optional/nullable for fields that aren't always set. */
export const optionalProductMoneySchema = productMoneySchema.nullish();

/** Shared by every listing-creation action (products, digital products,
 * services) that requires both fields up front. */
export const listingTitleDescriptionSchema = z.object({
  title: productTitleSchema,
  description: productDescriptionSchema,
});

/** updateProductAction takes a Partial<ProductInput> — every field here is
 * optional so only the fields actually present in a given update get checked. */
export const productUpdateInputSchema = z.object({
  title: productTitleSchema.optional(),
  description: productDescriptionSchema.optional(),
  price: productMoneySchema.optional(),
  compareAtPrice: optionalProductMoneySchema,
  dealPrice: optionalProductMoneySchema,
});

export const auctionPricingInputSchema = z.object({
  startingBid: productMoneySchema,
  reservePrice: optionalProductMoneySchema,
  buyNowPrice: optionalProductMoneySchema,
  // Falsy (0/undefined) is a legitimate "use the default" signal upstream
  // (see createProductAction) — only negative/absurd values should be rejected.
  minIncrement: z.number().finite("Enter a valid amount").nonnegative("Minimum increment can't be negative").max(10_000_000, "Minimum increment is too high"),
});

export const servicePackageInputSchema = z.object({
  price: productMoneySchema,
  deliverables: z.string().trim().min(1, "Describe what's included").max(1000, "Description is too long (1000 characters max)"),
  deliveryDays: z.number().int("Enter a whole number of days").positive("Set a valid delivery time").max(365, "Delivery time is too long"),
  revisionsIncluded: z.number().int("Enter a whole number").min(0, "Revisions can't be negative").max(50, "Too many revisions included"),
});

export const reportInputSchema = z.object({
  targetLabel: z.string().trim().min(1, "Missing report target").max(200, "Target label is too long"),
  reason: z.string().trim().min(1, "Select a reason").max(200, "Reason is too long"),
  details: z.string().trim().max(500, "Details are too long (500 characters max)").optional(),
});

export const promoCodeInputSchema = z.object({
  code: z.string().trim().min(1, "Enter a code").max(30, "Code is too long (30 characters max)"),
  discountValue: z.number().finite("Enter a valid amount").positive("Discount value must be greater than zero").max(1_000_000, "Discount value is too high"),
  minSubtotal: z.number().finite("Enter a valid amount").nonnegative("Minimum spend can't be negative").max(10_000_000, "Minimum spend is too high").nullish(),
});

/** Admin moderation actions' free-text "reason" params — shown to the
 * affected seller/buyer and/or logged to the audit trail, so it needs a
 * ceiling even though only admins can submit it. */
export const adminReasonSchema = z.string().trim().min(1, "A reason is required.").max(1000, "Reason is too long (1000 characters max)");

export const supportTicketInputSchema = z.object({
  name: z.string().trim().max(120, "Name is too long (120 characters max)"),
  email: z.string().trim().max(200, "Email is too long"),
  message: z.string().trim().max(3000, "Message is too long (3000 characters max)"),
});

export const eventInputSchema = z.object({
  name: z.string().trim().min(1, "Enter an event name").max(140, "Name is too long (140 characters max)"),
  description: z.string().trim().max(5000, "Description is too long (5000 characters max)"),
  venue: z.string().trim().min(1, "Enter a venue").max(200, "Venue is too long (200 characters max)"),
  city: z.string().trim().min(1, "Enter a city").max(120, "City is too long"),
  organiserName: z.string().trim().min(1, "Enter an organiser name").max(140, "Organiser name is too long"),
});

export const userCollectionNameSchema = z.string().trim().min(1, "Give your collection a name").max(60, "Name is too long (60 characters max)");
export const userCollectionDescriptionSchema = z.string().trim().max(300, "Description is too long (300 characters max)");

export const broadcastInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(150, "Title is too long (150 characters max)"),
  body: z.string().trim().min(1, "Message is required").max(2000, "Message is too long (2000 characters max)"),
});

/** Bids/offers: must be a finite positive amount within a sane ceiling —
 * mirrors productMoneySchema's ceiling so one seller can't be griefed by a
 * bid like 1e308 breaking downstream arithmetic. */
export const bidAmountSchema = z.number().finite("Enter a valid amount").positive("Bid must be greater than 0").max(10_000_000, "Bid is too high");

/** Turns a failed safeParse into the `{ error }` shape every action already
 * returns on the first validation failure, in field-declaration order. */
export function firstIssue(result: { success: boolean; error?: { issues: { message: string }[] } }): string {
  return result.error?.issues[0]?.message ?? "Invalid input.";
}
