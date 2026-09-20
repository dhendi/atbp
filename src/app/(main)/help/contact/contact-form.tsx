"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitSupportTicketAction, type SupportTopic } from "@/lib/actions/support";

const TOPICS: { value: SupportTopic; label: string }[] = [
  { value: "ORDER", label: "Order & Shipping" },
  { value: "PAYMENT", label: "Payments" },
  { value: "ACCOUNT", label: "Account & Security" },
  { value: "SELLING", label: "Selling on ATBP" },
  { value: "OTHER", label: "Something else" },
];

export function ContactForm({
  defaultName,
  defaultEmail,
  orders,
}: {
  defaultName: string;
  defaultEmail: string;
  orders: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [topic, setTopic] = useState<SupportTopic>("ORDER");
  const [orderId, setOrderId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in your name, email, and message.");
      return;
    }
    setLoading(true);
    const res = await submitSupportTicketAction({ name, email, topic, orderId: orderId || undefined, message });
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setSent(true);
    router.refresh();
  }

  if (sent) {
    return (
      <div className="mt-8 flex flex-col items-center gap-3 rounded-card border border-ink-100 bg-ink-50 p-8 text-center">
        <CheckCircle2 size={28} className="text-live-500" />
        <p className="font-bold text-ink-900">Message sent</p>
        <p className="max-w-xs text-sm text-ink-500">Our team will get back to you at {email}.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-card border border-ink-100 bg-white p-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Topic</Label>
        <Select value={topic} onValueChange={(v) => setTopic(v as SupportTopic)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {TOPICS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {orders.length > 0 && (
        <div className="space-y-1.5">
          <Label>Related order (optional)</Label>
          <Select value={orderId} onValueChange={setOrderId}>
            <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              {orders.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>How can we help?</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Tell us what's going on..." rows={5} />
      </div>

      <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
        {loading ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
