"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleClosetFeaturedAction } from "@/lib/actions/admin";

export function ClosetFeaturedToggle({ closetId, featured }: { closetId: string; featured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const res = await toggleClosetFeaturedAction(closetId, !featured);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(featured ? "Removed from Staff Picks" : "Added to Staff Picks");
      router.refresh();
    });
  }

  return (
    <Button size="sm" variant={featured ? "brand" : "outline"} disabled={pending} onClick={toggle}>
      {featured ? "★ Staff Pick" : "Mark Staff Pick"}
    </Button>
  );
}
