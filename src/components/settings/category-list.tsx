"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/app/(app)/more/settings/categories/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface CategoryItem {
  id: string;
  name: string;
  productCount: number;
}

export function CategoryList({ categories }: { categories: CategoryItem[] }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [addState, addAction, addPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await createCategory(_prev, formData);
      if (result.success) setShowAdd(false);
      return result;
    },
    {},
  );

  const [editState, editAction, editPending] = useActionState(
    async (_prev: { error?: string; success?: boolean }, formData: FormData) => {
      const result = await updateCategory(_prev, formData);
      if (result.success) setEditingId(null);
      return result;
    },
    {},
  );

  async function handleDelete(id: string, name: string, productCount: number) {
    if (productCount > 0) {
      setDeleteError(`"${name}" has ${productCount} product${productCount !== 1 ? "s" : ""} — reassign them first.`);
      return;
    }
    if (!confirm(`Delete "${name}"?`)) return;
    const result = await deleteCategory(id);
    if (result.error) setDeleteError(result.error);
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="flex items-center justify-between rounded-[10px] bg-danger-light px-3 py-2 text-sm text-danger">
          <span>{deleteError}</span>
          <button type="button" onClick={() => setDeleteError(null)}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {categories.length === 0 && !showAdd && (
        <Card className="py-8 text-center text-sm text-text-secondary">
          No categories yet. Create your first one to organise your products.
        </Card>
      )}

      {categories.map((cat) =>
        editingId === cat.id ? (
          <Card key={cat.id} className="p-3">
            <form action={editAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={cat.id} />
              <Input
                name="name"
                defaultValue={cat.name}
                autoFocus
                className="flex-1"
                placeholder="Category name"
                required
              />
              <Button type="submit" size="md" disabled={editPending} className="h-11 w-11 shrink-0 px-0">
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => setEditingId(null)}
                className="h-11 w-11 shrink-0 px-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
            {editState.error && editingId === cat.id && (
              <p className="mt-2 text-xs text-danger">{editState.error}</p>
            )}
          </Card>
        ) : (
          <Card key={cat.id} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{cat.name}</p>
              <p className="text-xs text-text-secondary">
                {cat.productCount} product{cat.productCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setEditingId(cat.id)}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] text-text-secondary hover:bg-primary-light/60"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(cat.id, cat.name, cat.productCount)}
                className="flex h-9 w-9 items-center justify-center rounded-[8px] text-text-secondary hover:bg-danger-light hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ),
      )}

      {showAdd ? (
        <Card className="p-3">
          <form action={addAction} className="flex items-center gap-2">
            <Input
              name="name"
              autoFocus
              className="flex-1"
              placeholder="Category name"
              required
            />
            <Button type="submit" size="md" disabled={addPending} className="h-11 w-11 shrink-0 px-0">
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setShowAdd(false)}
              className="h-11 w-11 shrink-0 px-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </form>
          {addState.error && (
            <p className="mt-2 text-xs text-danger">{addState.error}</p>
          )}
        </Card>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-4 w-4" /> Add category
        </Button>
      )}
    </div>
  );
}
