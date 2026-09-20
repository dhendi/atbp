"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  toggleCollectionActiveAction, deleteCollectionAction,
  addProductToCollectionAction, removeProductFromCollectionAction,
  addSellerToCollectionAction, removeSellerFromCollectionAction,
} from "@/lib/actions/admin";

interface CollectionRowData {
  id: string;
  slug: string;
  title: string;
  type: string;
  active: boolean;
  products: { id: string; product: { id: string; title: string } }[];
  sellers: { id: string; seller: { id: string; shopName: string; handle: string } }[];
}

export function CollectionRow({ collection }: { collection: CollectionRowData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productQuery, setProductQuery] = useState("");
  const [sellerHandle, setSellerHandle] = useState("");

  function run(action: () => Promise<{ error?: string }>, successMsg?: string) {
    startTransition(async () => {
      const res = await action();
      if (res.error) toast.error(res.error);
      else {
        if (successMsg) toast.success(successMsg);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-card border border-ink-100 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 font-bold text-ink-900">
            {collection.title} <Badge variant={collection.active ? "success" : "subtle"}>{collection.active ? "Active" : "Hidden"}</Badge>
            <Badge variant="outline">{collection.type}</Badge>
          </p>
          <p className="text-xs text-ink-500">/{collection.slug}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => toggleCollectionActiveAction(collection.id))}>
            {collection.active ? "Hide" : "Show"}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Delete collection" disabled={pending} onClick={() => run(() => deleteCollectionAction(collection.id), "Collection removed")}>
            <Trash2 size={15} className="text-live-600" />
          </Button>
        </div>
      </div>

      {collection.type !== "SHOPS" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold uppercase text-ink-400">Products ({collection.products.length})</p>
          {collection.products.map((cp) => (
            <div key={cp.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-1.5 text-sm">
              <span className="truncate">{cp.product.title}</span>
              <button onClick={() => run(() => removeProductFromCollectionAction(cp.id))} className="text-ink-400 hover:text-live-600">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addProductToCollectionAction(collection.id, productQuery), "Product added");
              setProductQuery("");
            }}
            className="flex gap-2"
          >
            <Input value={productQuery} onChange={(e) => setProductQuery(e.target.value)} placeholder="Search product by title..." className="h-9" />
            <Button type="submit" size="sm" variant="outline" disabled={pending || !productQuery}><Plus size={13} /></Button>
          </form>
        </div>
      )}

      {collection.type === "SHOPS" && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-bold uppercase text-ink-400">Shops ({collection.sellers.length})</p>
          {collection.sellers.map((cs) => (
            <div key={cs.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-3 py-1.5 text-sm">
              <span className="truncate">{cs.seller.shopName} (@{cs.seller.handle})</span>
              <button onClick={() => run(() => removeSellerFromCollectionAction(cs.id))} className="text-ink-400 hover:text-live-600">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              run(() => addSellerToCollectionAction(collection.id, sellerHandle), "Shop added");
              setSellerHandle("");
            }}
            className="flex gap-2"
          >
            <Input value={sellerHandle} onChange={(e) => setSellerHandle(e.target.value)} placeholder="Seller @handle" className="h-9" />
            <Button type="submit" size="sm" variant="outline" disabled={pending || !sellerHandle}><Plus size={13} /></Button>
          </form>
        </div>
      )}
    </div>
  );
}
