"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { Send, ChevronLeft, Image as ImageIcon, X, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, timeAgo } from "@/lib/utils";
import { sendThreadMessageAction, deleteMessageAction, deleteThreadAction } from "@/lib/actions/social";
import { BlockUserButton } from "@/components/domain/block-user-button";
import { ReportDialog } from "@/components/domain/report-dialog";
import { compressImage } from "@/lib/client/compress-image";

interface Message {
  id: string;
  senderId: string;
  body: string;
  imageUrl?: string | null;
  createdAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function uploadImage(file: File): Promise<string> {
  const optimized = await compressImage(file);
  const blob = await upload(optimized.name, optimized, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: "image",
  });
  return blob.url;
}

export function ThreadClient({
  threadId, currentUserId, otherUserId, otherName, otherAvatar, otherProfileHref, initialMessages, initiallyBlockedByMe, blockedByThem,
}: {
  threadId: string;
  currentUserId: string;
  otherUserId: string;
  otherName: string;
  otherAvatar: string | null;
  otherProfileHref: string;
  initialMessages: Message[];
  initiallyBlockedByMe: boolean;
  blockedByThem: boolean;
}) {
  const router = useRouter();
  const { data, mutate } = useSWR<{ messages: Message[] }>(`/api/messages/${threadId}`, fetcher, {
    refreshInterval: 3000,
    fallbackData: { messages: initialMessages },
  });
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [blocked, setBlocked] = useState(initiallyBlockedByMe);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const messages = data?.messages ?? initialMessages;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handlePickImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setPendingImage(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function send() {
    if (!input.trim() && !pendingImage) return;
    const body = input;
    const image = pendingImage ?? undefined;
    setInput("");
    setPendingImage(null);
    const res = await sendThreadMessageAction(threadId, body, image);
    if (res && "error" in res) toast.error(res.error);
  }

  async function handleDelete(messageId: string) {
    mutate({ messages: messages.filter((m) => m.id !== messageId) }, false);
    const res = await deleteMessageAction(messageId);
    if (res && "error" in res) {
      toast.error(res.error);
      mutate();
      return;
    }
    mutate();
  }

  async function handleDeleteThread() {
    if (!confirm(`Delete this entire conversation with ${otherName}? This can't be undone.`)) return;
    const res = await deleteThreadAction(threadId);
    if (res && "error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Conversation deleted");
    router.push("/messages");
  }

  const canMessage = !blocked && !blockedByThem;

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-2xl flex-col md:h-[calc(100dvh-6rem)]">
      <div className="flex items-center gap-2 border-b border-ink-100 px-4 py-3">
        <Link href="/messages" className="md:hidden">
          <ChevronLeft size={20} />
        </Link>
        <Link href={otherProfileHref} className="flex flex-1 items-center gap-2 min-w-0 rounded-xl px-1 py-0.5 -mx-1 hover:bg-ink-50">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={otherAvatar ?? undefined} />
            <AvatarFallback className="text-xs">{otherName[0]}</AvatarFallback>
          </Avatar>
          <p className="truncate font-bold text-ink-900">{otherName}</p>
          <ChevronRight size={14} className="shrink-0 text-ink-300" />
        </Link>
        <button
          type="button"
          aria-label="Delete conversation"
          title="Delete conversation"
          onClick={handleDeleteThread}
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-live-600"
        >
          <Trash2 size={16} />
        </button>
        <ReportDialog
          targetType="USER"
          targetLabel={otherName}
          triggerLabel=""
          triggerClassName="flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100"
        />
        <BlockUserButton
          userId={otherUserId}
          initiallyBlocked={blocked}
          label={false}
          onChange={setBlocked}
        />
      </div>

      {blockedByThem && (
        <div className="bg-ink-100 px-4 py-2 text-center text-xs text-ink-500">This user isn&apos;t accepting messages right now.</div>
      )}
      {blocked && (
        <div className="bg-live-100 px-4 py-2 text-center text-xs text-live-600">You&apos;ve blocked this user. Unblock to send messages again.</div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={cn("flex items-center gap-1.5", mine ? "justify-end" : "justify-start")}>
              {mine && (
                <button
                  type="button"
                  aria-label="Delete message"
                  onClick={() => handleDelete(m.id)}
                  className="shrink-0 rounded-full p-1.5 text-ink-300 hover:bg-ink-100 hover:text-live-600"
                >
                  <Trash2 size={13} />
                </button>
              )}
              <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-800")}>
                {m.imageUrl && (
                  <div className="relative mb-1.5 h-40 w-48 overflow-hidden rounded-xl">
                    <Image src={m.imageUrl} alt="Attachment" fill className="object-cover" />
                  </div>
                )}
                {m.body}
                <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-ink-400")}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {pendingImage && (
        <div className="flex items-center gap-2 border-t border-ink-100 px-4 pt-2">
          <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-ink-100">
            <Image src={pendingImage} alt="Selected image preview" fill className="object-cover" />
          </div>
          <button onClick={() => setPendingImage(null)} aria-label="Remove selected image" className="text-ink-400 hover:text-live-600">
            <X size={16} />
          </button>
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2 border-t border-ink-100 p-3">
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePickImage(e.target.files)} />
        <Button type="button" size="icon" variant="outline" aria-label="Attach image" disabled={!canMessage || uploading} onClick={() => fileRef.current?.click()}>
          <ImageIcon size={16} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={canMessage ? "Type a message..." : "Messaging unavailable"}
          className="flex-1"
          disabled={!canMessage}
        />
        <Button type="submit" size="icon" variant="brand" aria-label="Send message" disabled={!canMessage}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
