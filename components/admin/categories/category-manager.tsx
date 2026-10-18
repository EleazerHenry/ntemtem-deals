"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { reorderCategories } from "@/app/admin/(panel)/categories/actions";
import { CategoryDeleteDialog, type DeleteTarget } from "@/components/admin/categories/category-delete-dialog";
import { CategorySheet, type CategoryEditTarget } from "@/components/admin/categories/category-sheet";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { thumbnailUrl } from "@/lib/product-images";
import { cn } from "@/lib/utils";

export type CategoryItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  productCount: number;
};

export function CategoryManager({ categories, uploadsEnabled }: { categories: CategoryItem[]; uploadsEnabled: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState(categories);
  const [editing, setEditing] = useState<CategoryEditTarget | null>(null);
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const [savingOrder, startSavingOrder] = useTransition();

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function saveOrder(next: CategoryItem[]) {
    const previous = items;
    setItems(next); // show it straight away
    startSavingOrder(async () => {
      const result = await reorderCategories(next.map((c) => c.id));
      if (!result.ok) {
        setItems(previous);
        toast.error(result.error);
        return;
      }
      toast.success("New order saved", { id: "category-order" });
      router.refresh();
    });
  }

  function move(index: number, by: -1 | 1) {
    saveOrder(arrayMove(items, index, index + by));
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((c) => c.id === active.id);
    const to = items.findIndex((c) => c.id === over.id);
    if (from >= 0 && to >= 0) saveOrder(arrayMove(items, from, to));
  }

  const afterChange = () => {
    setEditing(null);
    setDeleting(null);
    router.refresh();
  };

  const addButton = (
    <Button size="lg" onClick={() => setEditing({ mode: "new", id: crypto.randomUUID() })}>
      <Plus data-icon="inline-start" /> Add category
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="How your products are grouped in the shop. The order here is the order customers see."
        actions={items.length > 0 && addButton}
      />

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-card px-6 py-16 text-center shadow-soft">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-500 text-ink shadow-glow">
            <Tags className="size-7" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold">No categories yet</h2>
          <p className="mt-2 text-muted-foreground">Categories like “Phone Accessories” help customers find what they want.</p>
          <div className="mt-6">{addButton}</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <ol className="divide-y">
                {items.map((category, index) => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    index={index}
                    last={index === items.length - 1}
                    disabled={savingOrder}
                    onMove={(by) => move(index, by)}
                    onEdit={() =>
                      setEditing({
                        mode: "edit",
                        id: category.id,
                        productCount: category.productCount,
                        values: {
                          name: category.name,
                          slug: category.slug,
                          description: category.description ?? "",
                          image: category.image ?? "",
                          isActive: category.isActive,
                        },
                      })
                    }
                    onDelete={() => setDeleting({ id: category.id, name: category.name, productCount: category.productCount })}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
          <p className="flex items-start gap-2 border-t bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            {savingOrder && <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />}
            <span>
              Drag the handle<span className="sm:hidden"> (press and hold)</span> or use the arrows to change the
              order. It saves by itself.
            </span>
          </p>
        </div>
      )}

      <CategorySheet
        target={editing}
        uploadsEnabled={uploadsEnabled}
        onClose={() => setEditing(null)}
        onSaved={afterChange}
        onDelete={(target) => {
          setEditing(null);
          setDeleting(target);
        }}
      />
      <CategoryDeleteDialog
        target={deleting}
        others={items.filter((c) => c.id !== deleting?.id).map(({ id, name }) => ({ id, name }))}
        onClose={() => setDeleting(null)}
        onDeleted={afterChange}
      />
    </>
  );
}

function CategoryRow({
  category,
  index,
  last,
  disabled,
  onMove,
  onEdit,
  onDelete,
}: {
  category: CategoryItem;
  index: number;
  last: boolean;
  disabled: boolean;
  onMove: (by: -1 | 1) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });
  const count = category.productCount;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("relative flex items-center gap-2 bg-card px-2 py-3 sm:gap-3 sm:px-3", isDragging && "z-10 shadow-lift")}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        className="grid size-10 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label={`Reorder ${category.name}. Press space to pick up.`}
      >
        <GripVertical className="size-5" />
      </button>

      <span className="numeric hidden w-5 shrink-0 text-center text-sm text-muted-foreground sm:block">{index + 1}</span>

      <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl border bg-brand-50 font-heading text-lg font-semibold text-brand-800">
        {category.image ? (
          <Image src={thumbnailUrl(category.image, 96)} alt="" fill sizes="48px" className="object-cover" unoptimized />
        ) : (
          category.name.charAt(0).toUpperCase()
        )}
      </div>

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{category.name}</span>
          {!category.isActive && <Badge className="bg-muted text-muted-foreground">Hidden</Badge>}
        </span>
        <span className="block truncate text-sm text-muted-foreground">
          {count === 0 ? "No products yet" : count === 1 ? "1 product" : `${count} products`}
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        <Button variant="ghost" size="icon" className="size-10 sm:size-9" disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label={`Move ${category.name} up`}>
          <ArrowUp />
        </Button>
        <Button variant="ghost" size="icon" className="size-10 sm:size-9" disabled={disabled || last} onClick={() => onMove(1)} aria-label={`Move ${category.name} down`}>
          <ArrowDown />
        </Button>
        <Button variant="ghost" size="icon" className="hidden size-9 sm:inline-flex" onClick={onEdit} aria-label={`Edit ${category.name}`}>
          <Pencil />
        </Button>
        <Button variant="ghost" size="icon" className="hidden size-9 hover:text-destructive sm:inline-flex" onClick={onDelete} aria-label={`Delete ${category.name}`}>
          <Trash2 />
        </Button>
      </div>
    </li>
  );
}
