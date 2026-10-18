"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Loader2, PackageCheck, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteProduct, saveProduct } from "@/app/admin/(panel)/products/actions";
import { Field, FormSection } from "@/components/admin/form-section";
import { CategoryPicker, type CategoryOption } from "@/components/admin/product-form/category-picker";
import { PhotoManager } from "@/components/admin/product-form/photo-manager";
import { ProductPreview } from "@/components/admin/product-form/product-preview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatGHS } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import {
  parseMoney,
  productFieldErrors,
  productFormSchema,
  type ProductFieldErrors,
  type ProductFormValues,
} from "@/lib/validations/product";

const STORE_DOMAIN = "ntemtemdeals.com";
const DELIVERY_PRESETS = ["10-12 days", "7-10 days", "2-3 days"];
const DESCRIPTION_MAX = 5000;

// Order the fields appear in, so we focus the first problem on save
const FIELD_ORDER: (keyof ProductFormValues)[] = [
  "name",
  "slug",
  "description",
  "images",
  "price",
  "compareAtPrice",
  "deliveryEstimate",
  "categoryId",
];

const fieldId = (name: keyof ProductFormValues) => `product-${name}`;

function validate(values: ProductFormValues): ProductFieldErrors {
  const result = productFormSchema.safeParse(values);
  return result.success ? {} : productFieldErrors(result.error);
}

export function ProductForm({
  productId,
  isNew,
  uploadsEnabled,
  initialValues,
  categories: initialCategories,
}: {
  /** For new products, an id generated up front so photos upload to the right folder. */
  productId: string;
  isNew: boolean;
  uploadsEnabled: boolean;
  initialValues: ProductFormValues;
  categories: CategoryOption[];
}) {
  const router = useRouter();

  const [values, setValues] = useState(initialValues);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [categories, setCategories] = useState(initialCategories);
  const [errors, setErrors] = useState<ProductFieldErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [formError, setFormError] = useState("");
  const [slugSuggestion, setSlugSuggestion] = useState("");
  // New products: the web address follows the name until the owner edits it.
  // Existing products keep their address so links already shared keep working.
  const [slugLocked, setSlugLocked] = useState(!isNew);
  const [editingSlug, setEditingSlug] = useState(false);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const [photosBusy, setPhotosBusy] = useState(false);

  const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);

  // Warn before closing the tab with unsaved work
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function update(patch: Partial<ProductFormValues>) {
    const next = { ...values, ...patch };
    if ("name" in patch && !slugLocked) next.slug = slugify(patch.name ?? "");
    setValues(next);
    if (next.slug !== values.slug) setSlugSuggestion("");
    // After the first save attempt, re-check as they type so errors clear
    if (attempted) setErrors(validate(next));
  }

  function focusFirstError(fieldErrors: ProductFieldErrors) {
    const first = FIELD_ORDER.find((f) => fieldErrors[f]);
    if (!first) return;
    if (first === "slug") setEditingSlug(true);
    requestAnimationFrame(() => {
      const el = document.getElementById(fieldId(first));
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      el?.focus({ preventScroll: true });
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    setFormError("");

    const clientErrors = validate(values);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      toast.error("A few things need fixing — they're highlighted in red.");
      focusFirstError(clientErrors);
      return;
    }

    startSaving(async () => {
      const result = await saveProduct({ id: productId, isNew }, values);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.formError ?? "");
        setSlugSuggestion(result.slugSuggestion ?? "");
        if (result.fieldErrors) focusFirstError(result.fieldErrors);
        toast.error(result.formError ?? "A few things need fixing — they're highlighted in red.");
        return;
      }

      setSavedValues(values);
      if (isNew) {
        toast.success(
          values.isActive ? `“${result.name}” is now in your store` : `“${result.name}” saved as hidden`,
        );
        router.push("/admin/products");
      } else {
        toast.success("Changes saved");
        setSlugLocked(true);
        setEditingSlug(false);
        router.refresh();
      }
    });
  }

  function onDelete() {
    startDeleting(async () => {
      const result = await deleteProduct(productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`“${savedValues.name}” deleted`);
      router.push("/admin/products");
    });
  }

  const price = parseMoney(values.price) ?? null;
  const compareAt = parseMoney(values.compareAtPrice) ?? null;
  const savings = price !== null && compareAt !== null && compareAt > price ? compareAt - price : 0;
  const categoryName = categories.find((c) => c.id === values.categoryId)?.name;
  const inputError = (name: keyof ProductFormValues) => ({
    id: fieldId(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": `${fieldId(name)}-message`,
  });

  return (
    <form onSubmit={onSubmit} noValidate className="pb-28">
      {/* grid-cols-1 = minmax(0,1fr): stops a long web address widening the page on phones */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="space-y-6">
          <FormSection title="Product details" description="What it is, in your own words.">
            <Field
              id={fieldId("name")}
              label="Product name"
              error={errors.name}
              hint="Use the words customers would search for, e.g. “Magnetic Wireless Car Charger”."
            >
              <Input
                {...inputError("name")}
                value={values.name}
                onChange={(e) => update({ name: e.target.value })}
                placeholder="e.g. Magnetic Wireless Car Charger"
                className="h-11 text-base sm:text-sm"
                autoFocus={isNew}
                maxLength={120}
              />
            </Field>

            <div className="space-y-2 rounded-xl bg-muted/60 px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-muted-foreground">Web address</p>
                {!editingSlug && (
                  <button
                    type="button"
                    onClick={() => setEditingSlug(true)}
                    className="flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    <Pencil className="size-3" /> Edit
                  </button>
                )}
              </div>
              {editingSlug ? (
                <div className="space-y-2">
                  <div
                    className={cn(
                      "flex items-center overflow-hidden rounded-lg border bg-card focus-within:ring-3 focus-within:ring-ring/50",
                      errors.slug && "border-destructive",
                    )}
                  >
                    <span className="hidden shrink-0 pl-3 text-sm text-muted-foreground sm:inline">
                      {STORE_DOMAIN}/products/
                    </span>
                    <input
                      {...inputError("slug")}
                      value={values.slug}
                      onChange={(e) => {
                        setSlugLocked(true);
                        update({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
                      }}
                      onBlur={() => {
                        // Tidy stray dashes/characters, but only if needed — an unconditional
                        // update here would re-render away the suggestion button mid-click.
                        const tidy = slugify(values.slug, 100);
                        if (values.slug && tidy !== values.slug) update({ slug: tidy });
                      }}
                      className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none sm:pl-0"
                      aria-label="Web address"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {values.name && slugify(values.name) !== values.slug && (
                      <button
                        type="button"
                        onClick={() => {
                          setSlugLocked(!isNew);
                          update({ slug: slugify(values.name) });
                        }}
                        className="text-xs font-medium text-brand-700 hover:underline"
                      >
                        Match the product name
                      </button>
                    )}
                    {!isNew && (
                      <p className="text-xs text-muted-foreground">
                        Changing this breaks links you&apos;ve already shared.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="truncate text-sm">
                  <span className="text-muted-foreground">{STORE_DOMAIN}/products/</span>
                  <span className="font-medium">{values.slug || "your-product-name"}</span>
                </p>
              )}
              {errors.slug && (
                <p id={`${fieldId("slug")}-message`} role="alert" className="text-sm text-destructive">
                  {errors.slug}{" "}
                  {slugSuggestion && (
                    <button
                      type="button"
                      onClick={() => {
                        setSlugLocked(true);
                        update({ slug: slugSuggestion });
                        setErrors((e) => ({ ...e, slug: undefined }));
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
              id={fieldId("description")}
              label="Description"
              error={errors.description}
              hint={
                <span className="flex justify-between gap-4">
                  <span>Mention size, colour, material, what&apos;s in the box and who it&apos;s for.</span>
                  <span className="numeric shrink-0">
                    {values.description.length.toLocaleString()}/{DESCRIPTION_MAX.toLocaleString()}
                  </span>
                </span>
              }
            >
              <Textarea
                {...inputError("description")}
                value={values.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder={"e.g. Holds your phone firmly with strong magnets and charges it as you drive.\n\nIn the box: charger, vent clip, USB-C cable."}
                className="min-h-40 text-base sm:text-sm"
                maxLength={DESCRIPTION_MAX}
              />
            </Field>
          </FormSection>

          <FormSection title="Photos" description="Clear, bright photos sell better. Show it from a few angles.">
            <PhotoManager
              id={fieldId("images")}
              productId={productId}
              images={values.images}
              onImagesChange={(change) => {
                setValues((v) => ({ ...v, images: change(v.images) }));
                setErrors((e) => ({ ...e, images: undefined }));
              }}
              onBusyChange={setPhotosBusy}
              enabled={uploadsEnabled}
              error={errors.images}
            />
          </FormSection>

          <FormSection title="Price" description="All prices are in Ghana cedis (GH₵).">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id={fieldId("price")} label="Selling price" error={errors.price} hint="What the customer pays.">
                <MoneyInput
                  {...inputError("price")}
                  value={values.price}
                  onChange={(price) => update({ price })}
                  placeholder="0.00"
                />
              </Field>
              <Field
                id={fieldId("compareAtPrice")}
                label="“Was” price"
                optional
                error={errors.compareAtPrice}
                hint="Shows a crossed-out old price. Leave empty if there's no discount."
              >
                <MoneyInput
                  {...inputError("compareAtPrice")}
                  value={values.compareAtPrice}
                  onChange={(compareAtPrice) => update({ compareAtPrice })}
                  placeholder="0.00"
                />
              </Field>
            </div>
            {price !== null && (
              <p
                className={cn(
                  "rounded-xl px-3.5 py-3 text-sm",
                  savings > 0 ? "bg-success/10 text-success" : "bg-muted/60 text-muted-foreground",
                )}
              >
                Customers pay <strong className="numeric">{formatGHS(price)}</strong>
                {savings > 0 && (
                  <>
                    {" "}
                    and save <strong className="numeric">{formatGHS(savings)}</strong> (
                    {Math.round((savings / compareAt!) * 100)}% off) — shown as a deal.
                  </>
                )}
              </p>
            )}
          </FormSection>

          <FormSection title="Availability & delivery">
            <RadioGroup
              value={values.stockType}
              onValueChange={(v) => update({ stockType: v as ProductFormValues["stockType"] })}
              className="grid gap-3 sm:grid-cols-2"
              aria-label="How this product is supplied"
            >
              {(
                [
                  {
                    value: "PREORDER",
                    icon: Clock,
                    title: "Pre-order",
                    body: "You order it from China after the customer pays.",
                  },
                  {
                    value: "IN_STOCK",
                    icon: PackageCheck,
                    title: "In stock",
                    body: "You already have it in Ghana, ready to send.",
                  },
                ] as const
              ).map(({ value, icon: Icon, title, body }) => (
                <label
                  key={value}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors",
                    values.stockType === value ? "border-brand-500 bg-brand-50" : "hover:bg-muted/50",
                  )}
                >
                  <RadioGroupItem value={value} className="mt-0.5" />
                  <span className="space-y-1">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Icon className="size-4" /> {title}
                    </span>
                    <span className="block text-sm text-muted-foreground">{body}</span>
                  </span>
                </label>
              ))}
            </RadioGroup>

            <Field
              id={fieldId("deliveryEstimate")}
              label="Delivery time"
              error={errors.deliveryEstimate}
              hint="Shown on the product page so customers know when to expect it."
            >
              <Input
                {...inputError("deliveryEstimate")}
                value={values.deliveryEstimate}
                onChange={(e) => update({ deliveryEstimate: e.target.value })}
                className="h-11 text-base sm:text-sm"
                maxLength={40}
              />
              <div className="flex flex-wrap gap-2">
                {DELIVERY_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => update({ deliveryEstimate: preset })}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      values.deliveryEstimate === preset
                        ? "border-ink bg-ink text-paper"
                        : "text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                    )}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </Field>
          </FormSection>

          {!isNew && (
            <section className="rounded-2xl border border-destructive/30 bg-card p-5 sm:p-6">
              <h2 className="font-sans text-base font-semibold tracking-normal">Delete product</h2>
              <p className="mt-1 mb-4 text-sm text-muted-foreground">
                Removes it from your store for good. To stop selling it for a while, turn off “Show in
                store” instead.
              </p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" disabled={deleting}>
                    <Trash2 data-icon="inline-start" /> Delete product
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete “{savedValues.name}”?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This can&apos;t be undone. Past orders keep their details, but the product disappears
                      from your store and admin.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-paper hover:bg-destructive/90"
                    >
                      Yes, delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </section>
          )}
        </div>

        {/* Side column */}
        <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          <FormSection title="Visibility">
            <ToggleRow
              id="product-isActive"
              title="Show in store"
              description={values.isActive ? "Live — customers can see and buy it." : "Hidden — only you can see it."}
              checked={values.isActive}
              onChange={(isActive) => update({ isActive })}
            />
            <ToggleRow
              id="product-isFeatured"
              title="Show on homepage"
              description="Feature it in the homepage deals section."
              checked={values.isFeatured}
              onChange={(isFeatured) => update({ isFeatured })}
            />
          </FormSection>

          <FormSection title="Category">
            <Field id={fieldId("categoryId")} label="Category" error={errors.categoryId} hint="Where customers find it.">
              <CategoryPicker
                id={fieldId("categoryId")}
                value={values.categoryId}
                onChange={(categoryId) => update({ categoryId })}
                categories={categories}
                onCategoriesChange={setCategories}
                invalid={!!errors.categoryId}
              />
            </Field>
          </FormSection>

          <ProductPreview
            imageUrl={values.images[0]}
            name={values.name.trim()}
            categoryName={categoryName}
            price={price}
            compareAtPrice={compareAt}
            stockType={values.stockType}
            deliveryEstimate={values.deliveryEstimate.trim()}
            isActive={values.isActive}
            isFeatured={values.isFeatured}
          />
        </div>
      </div>

      {/* Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:left-[272px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <p className="min-w-0 truncate text-sm text-muted-foreground">
            {photosBusy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" /> Uploading photos…
              </span>
            ) : formError ? (
              <span className="text-destructive">{formError}</span>
            ) : dirty ? (
              <span className="flex items-center gap-2">
                <span className="size-2 shrink-0 rounded-full bg-brand-500" /> Unsaved changes
              </span>
            ) : isNew ? (
              "Fill in the details, then save."
            ) : (
              "All changes saved"
            )}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="lg" className="hidden sm:inline-flex">
              <Link href="/admin/products">Cancel</Link>
            </Button>
            <Button type="submit" size="lg" disabled={saving || photosBusy || (!isNew && !dirty)} className="min-w-32">
              {saving && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {saving ? "Saving…" : isNew ? "Save product" : "Save changes"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function MoneyInput({
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange" | "value"> & {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
        GH₵
      </span>
      <Input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        autoComplete="off"
        className="numeric h-11 pl-12 text-base sm:text-sm"
      />
    </div>
  );
}

function ToggleRow({
  id,
  title,
  description,
  checked,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer space-y-0.5">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}
