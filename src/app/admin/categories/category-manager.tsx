"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Plus, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/lib/actions/admin";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string | null;
  productCount: number;
  childCount: number;
  parentName: string | null;
}

const NONE = "__none__";

export function CategoryManager({ categories, topLevelOptions }: { categories: Category[]; topLevelOptions: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editParentId, setEditParentId] = useState<string>(NONE);
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !icon) return;
    setLoading(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const res = await createCategoryAction(name, slug, icon);
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Category added");
    setName("");
    setIcon("");
    router.refresh();
  }

  function startEdit(c: Category) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditIcon(c.icon);
    setEditParentId(c.parentId ?? NONE);
  }

  async function saveEdit(c: Category) {
    setSaving(true);
    const res = await updateCategoryAction(c.id, {
      name: editName,
      icon: editIcon,
      parentId: editParentId === NONE ? null : editParentId,
    });
    setSaving(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Category updated");
    setEditingId(null);
    router.refresh();
  }

  return (
    <div className="max-w-xl space-y-4">
      <form onSubmit={handleAdd} className="flex gap-2 rounded-card border border-ink-100 bg-white p-3">
        <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎨" className="w-16 text-center" maxLength={2} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="flex-1" />
        <Button type="submit" variant="brand" disabled={loading}>
          <Plus size={15} /> Add
        </Button>
      </form>

      <div className="space-y-2">
        {categories.map((c) => (
          <div key={c.id} className="rounded-card border border-ink-100 bg-white p-3">
            {editingId === c.id ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} className="w-16 text-center" maxLength={2} />
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                </div>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  disabled={c.childCount > 0}
                  className="w-full rounded-lg border border-ink-200 px-2.5 py-1.5 text-sm disabled:bg-ink-50 disabled:text-ink-400"
                >
                  <option value={NONE}>Top-level (no parent)</option>
                  {topLevelOptions.filter((t) => t.id !== c.id).map((t) => (
                    <option key={t.id} value={t.id}>Under {t.name}</option>
                  ))}
                </select>
                {c.childCount > 0 && <p className="text-xs text-ink-400">Has {c.childCount} child categories, so it can&apos;t also be nested under another.</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="brand" disabled={saving} onClick={() => saveEdit(c)}><Check size={14} /> Save</Button>
                  <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditingId(null)}><X size={14} /> Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xl">{c.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-ink-900">{c.name}</p>
                  <p className="text-xs text-ink-500">
                    {c.productCount} products {c.parentName ? `· under ${c.parentName}` : "· top-level"}
                  </p>
                </div>
                <button
                  onClick={() => startEdit(c)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                  aria-label="Edit category"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={async () => {
                    const res = await deleteCategoryAction(c.id);
                    if ("error" in res) return toast.error(res.error);
                    toast.success("Category removed");
                    router.refresh();
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete category"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
