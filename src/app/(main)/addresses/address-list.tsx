"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAddressAction, setDefaultAddressAction } from "@/lib/actions/addresses";

interface Address {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  isDefault: boolean;
}

export function AddressList({ addresses }: { addresses: Address[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {addresses.map((a) => (
        <div key={a.id} className="rounded-2xl border border-ink-200 bg-white p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-ink-900">
                {a.fullName}
                {a.isDefault && <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700">Default</span>}
              </p>
              <p className="text-sm text-ink-500">{a.phone}</p>
              <p className="text-sm text-ink-600">{a.line1}, {a.city}, {a.province} {a.postalCode}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {!a.isDefault && (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Set as default"
                  aria-label="Set as default address"
                  disabled={pending}
                  onClick={() => startTransition(async () => {
                    const res = await setDefaultAddressAction(a.id);
                    if ("error" in res) toast.error(res.error);
                  })}
                >
                  <Star size={15} />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                title="Delete"
                aria-label={`Delete address for ${a.fullName}`}
                disabled={pending}
                onClick={() => startTransition(async () => {
                  const res = await deleteAddressAction(a.id);
                  if ("error" in res) toast.error(res.error);
                  else toast.success("Address removed");
                })}
              >
                <Trash2 size={15} className="text-live-600" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
