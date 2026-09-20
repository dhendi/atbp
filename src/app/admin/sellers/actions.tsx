"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveSellerAction, suspendSellerAction, verifyBirLicenseAction } from "@/lib/actions/admin";

export function SellerModerationActions({
  sellerId, status, sellerKind, birVerified,
}: { sellerId: string; status: string; sellerKind: string; birVerified: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {sellerKind === "BUSINESS" && !birVerified && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await verifyBirLicenseAction(sellerId);
              if ("error" in res) {
                toast.error(res.error);
                return;
              }
              toast.success("BIR registration verified");
              router.refresh();
            })
          }
        >
          Verify BIR License
        </Button>
      )}
      {status !== "APPROVED" && (
        <Button
          size="sm"
          variant="brand"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await approveSellerAction(sellerId);
              if ("error" in res) {
                toast.error(res.error);
                return;
              }
              toast.success("Seller approved");
              router.refresh();
            })
          }
        >
          Approve
        </Button>
      )}
      {status !== "SUSPENDED" && (
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await suspendSellerAction(sellerId);
              if ("error" in res) {
                toast.error(res.error);
                return;
              }
              toast.success("Seller suspended");
              router.refresh();
            })
          }
        >
          Suspend
        </Button>
      )}
    </div>
  );
}
