"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertCircle, ImageOff, ImagePlus, RotateCw, Star, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { signPhotoUpload, type SignPhotoUploadResult } from "@/app/admin/(panel)/products/actions";
import {
  MAX_PHOTOS,
  deliveryUrl,
  photoProblem,
  thumbnailUrl,
} from "@/lib/product-images";
import { cn } from "@/lib/utils";

type Signed = Extract<SignPhotoUploadResult, { ok: true }>["upload"];

type Upload = {
  key: string;
  file: File;
  preview: string;
  progress: number;
  status: "uploading" | "error";
  error?: string;
};

type ImagesUpdater = (update: (images: string[]) => string[]) => void;

/** Browser -> Cloudinary upload with progress. Resolves to the stored delivery URL. */
function uploadToCloudinary(file: File, signed: Signed, onProgress: (pct: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("timestamp", String(signed.timestamp));
    body.append("signature", signed.signature);
    body.append("folder", signed.folder);
    body.append("allowed_formats", signed.allowed_formats);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(deliveryUrl(signed.cloudName, res.version, res.public_id));
        } else {
          reject(new Error(res?.error?.message ?? `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error("Upload failed — unexpected response"));
      }
    };
    xhr.onerror = () => reject(new Error("No connection — check your internet and try again"));
    xhr.send(body);
  });
}

export function PhotoManager({
  id,
  productId,
  images,
  onImagesChange,
  onBusyChange,
  enabled,
  error,
}: {
  id: string;
  productId: string;
  images: string[];
  onImagesChange: ImagesUpdater;
  onBusyChange: (busy: boolean) => void;
  enabled: boolean;
  error?: string;
}) {
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const signedRef = useRef<{ value: Signed; at: number } | null>(null);

  const uploading = uploads.filter((u) => u.status === "uploading").length;
  const slotsLeft = MAX_PHOTOS - images.length - uploads.length;

  useEffect(() => onBusyChange(uploading > 0), [uploading, onBusyChange]);

  // A photo dropped outside the box would make the browser open it and lose the form
  useEffect(() => {
    const block = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // On phones, press and hold to drag so normal scrolling still works
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function getSignature() {
    // Signatures last an hour; refresh well before that
    if (signedRef.current && Date.now() - signedRef.current.at < 30 * 60 * 1000) return signedRef.current.value;
    const result = await signPhotoUpload(productId);
    if (!result.ok) throw new Error(result.error);
    signedRef.current = { value: result.upload, at: Date.now() };
    return result.upload;
  }

  function patchUpload(key: string, patch: Partial<Upload>) {
    setUploads((list) => list.map((u) => (u.key === key ? { ...u, ...patch } : u)));
  }

  function removeUpload(key: string) {
    setUploads((list) => {
      const gone = list.find((u) => u.key === key);
      if (gone) URL.revokeObjectURL(gone.preview);
      return list.filter((u) => u.key !== key);
    });
  }

  async function startUpload(upload: Upload) {
    patchUpload(upload.key, { status: "uploading", progress: 0, error: undefined });
    try {
      const signed = await getSignature();
      const url = await uploadToCloudinary(upload.file, signed, (progress) => patchUpload(upload.key, { progress }));
      onImagesChange((current) => [...current, url]);
      removeUpload(upload.key);
    } catch (e) {
      patchUpload(upload.key, { status: "error", error: (e as Error).message });
    }
  }

  function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (!files.length) return;

    const problems: string[] = [];
    const accepted: File[] = [];
    for (const file of files) {
      const problem = photoProblem(file);
      if (problem) problems.push(problem);
      else if (accepted.length < slotsLeft) accepted.push(file);
      else problems.push(`“${file.name}” wasn't added — a product can have up to ${MAX_PHOTOS} photos.`);
    }
    problems.forEach((p) => toast.error(p));

    const fresh: Upload[] = accepted.map((file) => ({
      key: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: "uploading",
    }));
    if (!fresh.length) return;
    setUploads((list) => [...list, ...fresh]);
    fresh.forEach(startUpload);
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    onImagesChange((current) => {
      const from = current.indexOf(String(active.id));
      const to = current.indexOf(String(over.id));
      return from < 0 || to < 0 ? current : arrayMove(current, from, to);
    });
  }

  if (!enabled) {
    return (
      <div id={id} tabIndex={-1} className="flex gap-3 rounded-xl border border-dashed bg-muted/40 p-5">
        <ImageOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <p className="font-medium">Photo upload isn&apos;t set up yet</p>
          <p className="text-sm text-muted-foreground">
            The photo service still needs its keys. You can save the product now and add photos once it&apos;s
            connected.
          </p>
          {images.length > 0 && (
            <p className="text-sm text-muted-foreground">This product already has {images.length} photo(s) saved.</p>
          )}
        </div>
      </div>
    );
  }

  const dropProps = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      if (slotsLeft > 0) setDragOver(true);
    },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (slotsLeft > 0) addFiles(e.dataTransfer.files);
      else toast.error(`You've reached ${MAX_PHOTOS} photos. Remove one to add another.`);
    },
  };

  const hasAny = images.length + uploads.length > 0;

  return (
    <div id={id} tabIndex={-1} className="space-y-3 outline-none">
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = ""; // allow picking the same file again
        }}
      />

      {!hasAny ? (
        <button
          type="button"
          {...dropProps}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragOver ? "border-brand-500 bg-brand-50" : "bg-muted/40 hover:border-foreground/25 hover:bg-muted/70",
            error && "border-destructive",
          )}
        >
          <span className="grid size-12 place-items-center rounded-xl bg-brand-500 text-ink shadow-glow">
            <Upload className="size-6" />
          </span>
          <span>
            <span className="block font-medium">Drag photos here, or tap to choose</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              JPG, PNG or WebP · up to 10MB each · {MAX_PHOTOS} photos max
            </span>
          </span>
        </button>
      ) : (
        <div {...dropProps} className={cn("rounded-xl transition-colors", dragOver && "bg-brand-50 ring-2 ring-brand-500")}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={images} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {images.map((url, index) => (
                  <SortablePhoto
                    key={url}
                    url={url}
                    index={index}
                    onMakeMain={() => onImagesChange((current) => [url, ...current.filter((u) => u !== url)])}
                    onRemove={() => onImagesChange((current) => current.filter((u) => u !== url))}
                  />
                ))}
                {uploads.map((u) => (
                  <UploadTile
                    key={u.key}
                    upload={u}
                    onRetry={() => startUpload(u)}
                    onRemove={() => removeUpload(u.key)}
                  />
                ))}
                {slotsLeft > 0 && (
                  <li>
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-muted-foreground transition-colors hover:border-foreground/25 hover:bg-muted/60 hover:text-foreground"
                    >
                      <ImagePlus className="size-6" />
                      <span className="text-xs font-medium">Add photos</span>
                    </button>
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : (
        hasAny && (
          <p className="text-sm text-muted-foreground">
            The first photo is the main one customers see. Drag to reorder
            <span className="sm:hidden"> (press and hold)</span>, or tap the star to make a photo the main one.{" "}
            <span className="numeric">
              {images.length + uploads.length}/{MAX_PHOTOS}
            </span>
          </p>
        )
      )}
    </div>
  );
}

function SortablePhoto({
  url,
  index,
  onMakeMain,
  onRemove,
}: {
  url: string;
  index: number;
  onMakeMain: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });
  const isMain = index === 0;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative touch-manipulation", isDragging && "z-10")}
    >
      <div
        {...attributes}
        {...listeners}
        aria-label={`Photo ${index + 1}${isMain ? ", main photo" : ""}. Press space to pick up and reorder.`}
        className={cn(
          "relative aspect-square cursor-grab overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing",
          isMain && "ring-2 ring-brand-500",
          isDragging && "scale-105 shadow-lift",
        )}
      >
        <Image src={thumbnailUrl(url, 320)} alt="" fill sizes="(min-width: 640px) 160px, 33vw" className="object-cover" unoptimized draggable={false} />
        {isMain && (
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/85 px-1.5 py-0.5 text-[0.65rem] font-semibold text-paper">
            Main photo
          </span>
        )}
      </div>
      <div className="absolute top-1.5 right-1.5 flex gap-1">
        {!isMain && (
          <button
            type="button"
            onClick={onMakeMain}
            className="grid size-7 place-items-center rounded-full bg-card/90 text-foreground shadow-soft backdrop-blur hover:bg-card"
            aria-label={`Make photo ${index + 1} the main photo`}
            title="Make main photo"
          >
            <Star className="size-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="grid size-7 place-items-center rounded-full bg-card/90 text-foreground shadow-soft backdrop-blur hover:bg-destructive hover:text-paper"
          aria-label={`Remove photo ${index + 1}`}
          title="Remove photo"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

function UploadTile({ upload, onRetry, onRemove }: { upload: Upload; onRetry: () => void; onRemove: () => void }) {
  const failed = upload.status === "error";
  return (
    <li className="relative">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img src={upload.preview} alt="" className={cn("size-full object-cover", "opacity-50")} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-2 text-center">
          {failed ? (
            <>
              <AlertCircle className="size-5 text-destructive" />
              <span className="line-clamp-3 text-[0.7rem] leading-tight font-medium text-destructive">{upload.error}</span>
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs font-medium shadow-soft"
              >
                <RotateCw className="size-3" /> Retry
              </button>
            </>
          ) : (
            <>
              <span className="numeric text-sm font-semibold text-ink">{upload.progress}%</span>
              <span className="h-1.5 w-3/4 overflow-hidden rounded-full bg-card/80">
                <span
                  className="block h-full rounded-full bg-brand-500 transition-[width] duration-200"
                  style={{ width: `${upload.progress}%` }}
                />
              </span>
            </>
          )}
        </div>
      </div>
      {failed && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-card/90 shadow-soft"
          aria-label="Remove failed upload"
        >
          <X className="size-3.5" />
        </button>
      )}
    </li>
  );
}
