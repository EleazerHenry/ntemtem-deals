"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImageOff, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { signCategoryImage } from "@/app/admin/(panel)/categories/actions";
import { Button } from "@/components/ui/button";
import { uploadToCloudinary } from "@/lib/cloudinary-upload";
import { photoProblem } from "@/lib/product-images";
import { cn } from "@/lib/utils";

/** One optional image per category, uploaded straight to Cloudinary. */
export function CategoryImagePicker({
  categoryId,
  value,
  onChange,
  onBusyChange,
  enabled,
  error,
}: {
  categoryId: string;
  value: string;
  onChange: (url: string) => void;
  onBusyChange: (busy: boolean) => void;
  enabled: boolean;
  error?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    const problem = photoProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setProgress(0);
    onBusyChange(true);
    try {
      const signed = await signCategoryImage(categoryId);
      if (!signed.ok) throw new Error(signed.error);
      onChange(await uploadToCloudinary(file, signed.upload, setProgress));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setProgress(null);
      onBusyChange(false);
    }
  }

  if (!enabled) {
    return (
      <p className="flex gap-2.5 rounded-xl border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        <ImageOff className="size-4 shrink-0" /> Image upload isn&apos;t set up yet. You can save the category without
        one.
      </p>
    );
  }

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
      className="sr-only"
      tabIndex={-1}
      onChange={(e) => {
        upload(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (progress !== null) {
    return (
      <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/40">
        <span className="numeric text-sm font-semibold">{progress}%</span>
        <span className="h-1.5 w-1/2 overflow-hidden rounded-full bg-card">
          <span className="block h-full rounded-full bg-brand-500 transition-[width]" style={{ width: `${progress}%` }} />
        </span>
        <span className="text-xs text-muted-foreground">Uploading…</span>
      </div>
    );
  }

  if (value) {
    return (
      <div className="space-y-2">
        {input}
        <div className="relative aspect-[16/9] overflow-hidden rounded-xl border bg-muted">
          <Image src={value} alt="" fill sizes="400px" className="object-cover" unoptimized />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <RefreshCw data-icon="inline-start" /> Replace
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} className="hover:text-destructive">
            <Trash2 data-icon="inline-start" /> Remove
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {input}
      <button
        type="button"
        id="category-image"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          upload(e.dataTransfer.files[0]);
        }}
        className={cn(
          "flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors",
          dragOver ? "border-brand-500 bg-brand-50" : "bg-muted/40 hover:border-foreground/25 hover:bg-muted/70",
          error && "border-destructive",
        )}
      >
        <ImagePlus className="size-6 text-muted-foreground" />
        <span className="text-sm font-medium">Add an image</span>
        <span className="text-xs text-muted-foreground">Drag one here or tap to choose · JPG, PNG or WebP</span>
      </button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
