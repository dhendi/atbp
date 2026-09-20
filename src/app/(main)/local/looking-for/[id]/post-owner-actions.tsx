"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { closeLookingForPostAction } from "@/lib/actions/looking-for";

export function PostOwnerActions({ postId }: { postId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handle(status: "FULFILLED" | "CLOSED") {
    setLoading(status);
    const res = await closeLookingForPostAction(postId, status);
    setLoading(null);
    if ("error" in res) return toast.error(res.error);
    toast.success(status === "FULFILLED" ? "Marked as fulfilled" : "Request closed");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="brand" disabled={!!loading} onClick={() => handle("FULFILLED")}>
        {loading === "FULFILLED" ? "Saving..." : "Mark as fulfilled"}
      </Button>
      <Button size="sm" variant="outline" disabled={!!loading} onClick={() => handle("CLOSED")}>
        {loading === "CLOSED" ? "Saving..." : "Close request"}
      </Button>
    </div>
  );
}
