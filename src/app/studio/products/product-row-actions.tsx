"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { deleteProductAction } from "@/lib/actions/products";

export function ProductRowActions({ productId }: { productId: string }) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-1">
      <Link href={`/studio/products/${productId}/edit`} className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100">
        <Pencil size={15} />
      </Link>
      <button
        onClick={async () => {
          if (!confirm("Remove this product listing?")) return;
          const res = await deleteProductAction(productId);
          if ("error" in res) return toast.error(res.error);
          toast.success("Product removed");
          router.refresh();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
