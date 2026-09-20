"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendMessageAction } from "@/lib/actions/social";

export function MessageSellerButton({ sellerId, postTitle }: { sellerId: string; postTitle: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await sendMessageAction(sellerId, `Hi! Following up on my "${postTitle}" request.`);
          if ("error" in res) {
            toast.error(res.error);
            return;
          }
          router.push(`/messages/${res.threadId}`);
        })
      }
    >
      <MessageCircle size={13} /> Message
    </Button>
  );
}
