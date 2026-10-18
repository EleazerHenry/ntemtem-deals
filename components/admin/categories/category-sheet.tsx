"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveCategory } from "@/app/admin/(panel)/categories/actions";
import type { DeleteTarget } from "@/components/admin/categories/category-delete-dialog";
import { CategoryImagePicker } from "@/components/admin/categories/category-image-picker";
import { Field } from "@/components/admin/form-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import {
  categoryFieldErrors,
  categoryFormSchema,
  type CategoryFieldErrors,
  type CategoryFormValues,
} from "@/lib/validations/category";

const STORE_DOMAIN = "ntemtemdeals.com";

export type CategoryEditTarget =
  | { mode: "new"; id: string }
  | { mode: "edit"; id: string; values: CategoryFormValues; productCount: number };

const EMPTY: CategoryFormValues = { name: "", slug: "", description: "", image: "", isActive: true };

export function CategorySheet({
  target,
  uploadsEnabled,
  onClose,
  onSaved,
  onDelete,
}: {
  target: CategoryEditTarget | null;
  uploadsEnabled: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (target: DeleteTarget) => void;
}) {
  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-md">
        {/* Remount per category so the form starts fresh each time */}
        {target && (
          <CategoryForm
            key={target.id}
            target={target}
            uploadsEnabled={uploadsEnabled}
            onClose={onClose}
            onSaved={onSaved}
            onDelete={onDelete}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function CategoryForm({
  target,
  uploadsEnabled,
  onClose,
  onSaved,
  onDelete,
}: {
  target: CategoryEditTarget;
  uploadsEnabled: boolean;
  onClose: () => void;
  onSaved: () => void;
  onDelete: (target: DeleteTarget) => void;
}) {
  const isNew = target.mode === "new";
  const [values, setValues] = useState<CategoryFormValues>(isNew ? EMPTY : target.values);
  const [errors, setErrors] = useState<CategoryFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [slugSuggestion, setSlugSuggestion] = useState("");
  // New: address follows the name. Existing: kept, so shared links keep working.
  const [slugLocked, setSlugLocked] = useState(!isNew);
  const [editingSlug, setEditingSlug] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [saving, startSaving] = useTransition();

  function update(patch: Partial<CategoryFormValues>) {
    setValues((v) => {
      const next = { ...v, ...patch };
      if ("name" in patch && !slugLocked) next.slug = slugify(patch.name ?? "");
      return next;
    });
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch) && !(k === "slug" && "name" in patch))));
    if ("slug" in patch || "name" in patch) setSlugSuggestion("");
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    const check = categoryFormSchema.safeParse(values);
    if (!check.success) {
      const found = categoryFieldErrors(check.error);
      // The address comes from the name — one "add a name" message is enough
      if (found.name && !slugLocked) delete found.slug;
      setErrors(found);
      if (found.slug) setEditingSlug(true);
      return;
    }
    startSaving(async () => {
      const result = await saveCategory({ id: target.id, isNew }, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? "");
        setSlugSuggestion(result.slugSuggestion ?? "");
        if (result.fieldErrors?.slug) setEditingSlug(true);
        return;
      }
      toast.success(isNew ? `Category “${result.category.name}” added` : "Category saved");
      onSaved();
    });
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
      <SheetHeader className="border-b px-5 py-4">
        <SheetTitle className="font-heading text-xl">{isNew ? "Add category" : "Edit category"}</SheetTitle>
        <SheetDescription>
          {isNew
            ? "Group similar products so customers can browse them together."
            : target.productCount === 0
              ? "No products in this category yet."
              : target.productCount === 1
                ? "1 product is in this category."
              : `${target.productCount} products are in this category.`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Field id="category-name" label="Name" error={errors.name} hint="Short and clear, e.g. “Phone Accessories”.">
          <Input
            id="category-name"
            value={values.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. Kitchen Gadgets"
            maxLength={60}
            autoFocus
            aria-invalid={errors.name ? true : undefined}
            className="h-11 text-base sm:text-sm"
          />
        </Field>

        <div className="space-y-2 rounded-xl bg-muted/60 px-3.5 py-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Web address</p>
            {!editingSlug && (
              <button type="button" onClick={() => setEditingSlug(true)} className="text-xs font-medium text-brand-700 hover:underline">
                Edit
              </button>
            )}
          </div>
          {editingSlug ? (
            <input
              id="category-slug"
              value={values.slug}
              onChange={(e) => {
                setSlugLocked(true);
                update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
              }}
              onBlur={() => {
                const tidy = slugify(values.slug, 80);
                if (values.slug && tidy !== values.slug) update({ slug: tidy });
              }}
              aria-label="Web address"
              aria-invalid={errors.slug ? true : undefined}
              className={cn(
                "h-10 w-full rounded-lg border bg-card px-3 text-sm outline-none focus:ring-3 focus:ring-ring/50",
                errors.slug && "border-destructive",
              )}
            />
          ) : (
            <p className="truncate text-sm">
              <span className="text-muted-foreground">{STORE_DOMAIN}/categories/</span>
              <span className="font-medium">{values.slug || "category-name"}</span>
            </p>
          )}
          {!isNew && editingSlug && (
            <p className="text-xs text-muted-foreground">Changing this breaks links you&apos;ve already shared.</p>
          )}
          {errors.slug && (
            <p role="alert" className="text-sm text-destructive">
              {errors.slug}{" "}
              {slugSuggestion && (
                <button
                  type="button"
                  onClick={() => {
                    setSlugLocked(true);
                    update({ slug: slugSuggestion });
                  }}
                  className="font-medium underline"
                >
                  Use “{slugSuggestion}” instead
                </button>
              )}
            </p>
          )}
        </div>

        <Field
          id="category-description"
          label="Description"
          optional
          error={errors.description}
          hint={
            <span className="flex justify-between gap-4">
              <span>Shown at the top of the category page.</span>
              <span className="numeric shrink-0">{values.description.length}/300</span>
            </span>
          }
        >
          <Textarea
            id="category-description"
            value={values.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="e.g. Chargers, cases, cables and holders for every phone."
            maxLength={300}
            className="min-h-24 text-base sm:text-sm"
          />
        </Field>

        <div className="space-y-2">
          <p className="flex items-baseline gap-2 text-sm font-medium">
            Image <span className="text-xs font-normal text-muted-foreground">Optional</span>
          </p>
          <CategoryImagePicker
            categoryId={target.id}
            value={values.image}
            onChange={(image) => update({ image })}
            onBusyChange={setImageBusy}
            enabled={uploadsEnabled}
            error={errors.image}
          />
          <p className="text-sm text-muted-foreground">Used on the homepage category tiles. A bright photo of a typical product works well.</p>
        </div>

        <div className="flex items-start justify-between gap-4">
          <label htmlFor="category-isActive" className="cursor-pointer space-y-0.5">
            <span className="block text-sm font-medium">Show in store</span>
            <span className="block text-sm text-muted-foreground">
              {values.isActive ? "Customers can browse this category." : "Hidden from your shop's category list."}
            </span>
          </label>
          <Switch id="category-isActive" checked={values.isActive} onCheckedChange={(isActive) => update({ isActive })} className="mt-0.5" />
        </div>

        {formError && <p className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">{formError}</p>}

        {target.mode === "edit" && (
          <div className="border-t pt-5">
            <Button
              type="button"
              variant="destructive"
              onClick={() => onDelete({ id: target.id, name: target.values.name, productCount: target.productCount })}
            >
              <Trash2 data-icon="inline-start" /> Delete category
            </Button>
          </div>
        )}
      </div>

      <SheetFooter className="flex-row justify-end gap-2 border-t px-5 py-4">
        <Button type="button" variant="outline" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="lg" disabled={saving || imageBusy} className="min-w-32">
          {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
          {imageBusy ? "Uploading…" : saving ? "Saving…" : isNew ? "Add category" : "Save changes"}
        </Button>
      </SheetFooter>
    </form>
  );
}
