import { Megaphone } from "lucide-react";
import { BroadcastForm } from "./broadcast-form";

export const dynamic = "force-dynamic";

export default function AdminBroadcastPage() {
  return (
    <div className="max-w-lg">
      <h1 className="mb-1 flex items-center gap-2 text-2xl font-extrabold text-ink-900"><Megaphone size={22} /> Broadcast</h1>
      <p className="mb-6 text-sm text-ink-500">Send an in-app (and push, where enabled) notification directly, for platform-wide announcements that aren&apos;t tied to a specific order or listing. Every other notification in ATBP is triggered by a real event; use this sparingly.</p>
      <BroadcastForm />
    </div>
  );
}
