"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/domain/image-uploader";
import { updateAccountProfileAction } from "@/lib/actions/account";

export function AccountSettingsForm({ initial }: { initial: { name: string; avatarUrl: string | null } }) {
  const router = useRouter();
  const { update } = useSession();
  const [name, setName] = useState(initial.name);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter your name.");
      return;
    }
    setLoading(true);
    const res = await updateAccountProfileAction({ name, avatarUrl: avatarUrl || null });
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    await update({ name, image: avatarUrl || null });
    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <div className="space-y-1.5">
        <Label>Profile picture</Label>
        <ImageUploader
          value={avatarUrl ? [avatarUrl] : []}
          onChange={(urls) => setAvatarUrl(urls[0] ?? "")}
          max={1}
          compact
          label="Add photo"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <Button type="submit" variant="brand" disabled={loading}>
        {loading ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
