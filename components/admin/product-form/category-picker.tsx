"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { createCategory } from "@/app/admin/(panel)/products/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type CategoryOption = { id: string; name: string; isActive: boolean };

export function CategoryPicker({
  id,
  value,
  onChange,
  categories,
  onCategoriesChange,
  invalid,
}: {
  id: string;
  value: string;
  onChange: (id: string) => void;
  categories: CategoryOption[];
  onCategoriesChange: (next: CategoryOption[]) => void;
  invalid?: boolean;
}) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setCreating(true);
    setError("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function submit() {
    setError("");
    startTransition(async () => {
      const result = await createCategory(name);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!result.existed) {
        onCategoriesChange([...categories, { ...result.category, isActive: true }]);
        toast.success(`Category “${result.category.name}” created`);
      } else {
        toast.info(`“${result.category.name}” already exists — selected it for you`);
      }
      onChange(result.category.id);
      setName("");
      setCreating(false);
    });
  }

  return (
    <div className="space-y-3">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-message`}
          className="h-11 w-full text-base sm:text-sm"
        >
          <SelectValue placeholder="Choose a category" />
        </SelectTrigger>
        <SelectContent position="popper">
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
              {!c.isActive && <span className="text-muted-foreground"> (hidden)</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {creating ? (
        <div className="space-y-2 rounded-xl border border-dashed bg-muted/40 p-3">
          <label htmlFor={`${id}-new`} className="text-sm font-medium">
            New category name
          </label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              id={`${id}-new`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                // Enter adds the category instead of submitting the product form
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
                if (e.key === "Escape") setCreating(false);
              }}
              placeholder="e.g. Kitchen Gadgets"
              className="h-10 bg-card"
              aria-invalid={!!error || undefined}
            />
            <Button type="button" onClick={submit} disabled={pending || !name.trim()} className="h-10">
              {pending ? <Loader2 className="animate-spin" /> : "Add"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-10"
              onClick={() => setCreating(false)}
              aria-label="Cancel new category"
            >
              <X />
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      ) : (
        <Button type="button" variant="link" className="h-auto p-0" onClick={openCreate}>
          <Plus data-icon="inline-start" /> Create a new category
        </Button>
      )}
    </div>
  );
}
