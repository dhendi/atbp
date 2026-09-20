import { Badge } from "@/components/ui/badge";
import { Gavel, Zap, Hand } from "lucide-react";

export function ModeBadge({ mode }: { mode: string }) {
  if (mode === "AUCTION") {
    return (
      <Badge variant="gold" className="gap-1">
        <Gavel size={11} /> Auction
      </Badge>
    );
  }
  if (mode === "CLAIM") {
    return (
      <Badge variant="brand" className="gap-1">
        <Hand size={11} /> Claim
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <Zap size={11} /> Buy Now
    </Badge>
  );
}
