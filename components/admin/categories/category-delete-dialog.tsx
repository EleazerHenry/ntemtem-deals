"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteCategory } from "@/app/admin/(panel)/categories/actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type DeleteTarget = { id: string; name: string; productCount: number };

export function CategoryDeleteDialog({
  target,
  others,
  onClose,
  onDeleted,
}: {
  target: DeleteTarget | null;
  /** Categories the products could move to */
  others: { id: string; name: string }[];
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [moveTo, setMoveTo] = useState("");
  const [pending, startDelete] = useTransition();
  const count = target?.productCount ?? 0;
  const productWord = count === 1 ? "product" : "products";

  function confirm() {
    if (!target) return;
    startDelete(async () => {
      const result = await deleteCategory(target.id, count > 0 ? moveTo : undefined);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const destination = others.find((o) => o.id === moveTo)?.name;
      toast.success(
        result.moved > 0
          ? `Moved ${result.moved} ${result.moved === 1 ? "product" : "products"} to “${destination}” and deleted “${target.name}”`
          : `Deleted “${target.name}”`,
      );
      setMoveTo("");
      onDeleted();
    });
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          setMoveTo("");
          onClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete “{target?.name}”?</AlertDialogTitle>
          <AlertDialogDescription>
            {count === 0
              ? "This category has no products, so nothing else changes. This can't be undone."
              : `This category still has ${count} ${productWord}. Every product needs a category, so choose where to move ${count === 1 ? "it" : "them"} first.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {count > 0 &&
          (others.length === 0 ? (
            <p className="rounded-lg bg-warning/25 px-3 py-2.5 text-sm">
              This is your only category. Create another one first, then you can move these products there.
            </p>
          ) : (
            <div className="space-y-2">
              <label htmlFor="move-products-to" className="text-sm font-medium">
                Move the {count} {productWord} to
              </label>
              <Select value={moveTo} onValueChange={setMoveTo}>
                <SelectTrigger id="move-products-to" className="h-11 w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {others.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Keep it</AlertDialogCancel>
          <Button
            type="button"
            onClick={confirm}
            disabled={pending || (count > 0 && !moveTo)}
            className="bg-destructive text-paper hover:bg-destructive/90"
          >
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : count > 0 ? <ArrowRight data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
            {count > 0 ? `Move ${count} & delete` : "Yes, delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
