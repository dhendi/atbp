"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { replyToLookingForAction } from "@/lib/actions/looking-for";

interface SellerProduct {
  id: string;
  title: string;
}

export function ReplyForm({ postId, products }: { postId: string; products: SellerProduct[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [productId, setProductId] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await replyToLookingForAction(postId, message, productId || undefined);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Reply sent");
    setMessage("");
    setProductId("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-card border border-ink-200 bg-white p-4">
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I have something like this. Let me know if you're interested!" required maxLength={500} />
      {products.length > 0 && (
        <Select value={productId || "none"} onValueChange={(v) => setProductId(v === "none" ? "" : v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Attach a product (optional)" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No product attached</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button type="submit" variant="brand" size="sm" disabled={loading}>
        {loading ? "Sending..." : "Reply"}
      </Button>
    </form>
  );
}
