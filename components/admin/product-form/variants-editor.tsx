"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  MAX_VARIANTS,
  PRICE_CHANGES,
  parseMoney,
  variantPrice,
  type ProductFieldErrors,
  type VariantRow,
} from "@/lib/validations/product";

const PRICE_CHANGE_LABELS: Record<(typeof PRICE_CHANGES)[number], string> = {
  same: "Same price",
  more: "Costs more",
  less: "Costs less",
};

const EXAMPLES = ["e.g. Black", "e.g. White", "e.g. Blue", "e.g. Red"];

export const variantFieldId = (index: number, field: "name" | "amount") => `variant-${index}-${field}`;

export function newVariantRow(): VariantRow {
  return { key: crypto.randomUUID(), name: "", priceChange: "same", amount: "", isActive: true };
}

/** The adjustment a row currently represents, or null if the amount isn't valid yet. */
function rowAdjustment(row: VariantRow) {
  if (row.priceChange === "same") return 0;
  const amount = parseMoney(row.amount);
  if (amount === null || amount === undefined) return null;
  return row.priceChange === "more" ? amount : -amount;
}

export function VariantsEditor({
  basePrice,
  enabled,
  rows,
  savedCount,
  errors,
  onChange,
}: {
  basePrice: number | null;
  enabled: boolean;
  rows: VariantRow[];
  /** Options already saved — warn before switching off deletes them. */
  savedCount: number;
  errors: ProductFieldErrors;
  /** One patch per interaction, so switching on + adding starter rows can't overwrite each other. */
  onChange: (patch: { hasVariants?: boolean; variants?: VariantRow[] }) => void;
}) {
  const onRowsChange = (variants: VariantRow[]) => onChange({ variants });

  function focusRow(index: number) {
    requestAnimationFrame(() => document.getElementById(variantFieldId(index, "name"))?.focus());
  }

  function toggle(on: boolean) {
    if (on && rows.length === 0) {
      onChange({ hasVariants: true, variants: [newVariantRow(), newVariantRow()] });
      focusRow(0);
    } else {
      onChange({ hasVariants: on });
    }
  }

  const patch = (index: number, change: Partial<VariantRow>) =>
    onRowsChange(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  function move(index: number, by: -1 | 1) {
    const next = [...rows];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    onRowsChange(next);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <label htmlFor="product-hasVariants" className="cursor-pointer space-y-0.5">
          <span className="block text-sm font-medium">Does this product come in options?</span>
          <span className="block text-sm text-muted-foreground">
            Like different colours, sizes or lengths. Customers choose one before adding it to their cart.
          </span>
        </label>
        <Switch id="product-hasVariants" checked={enabled} onCheckedChange={toggle} className="mt-0.5" />
      </div>

      {!enabled && savedCount > 0 && (
        <p className="rounded-xl bg-warning/25 px-3.5 py-3 text-sm text-warning-foreground">
          Saving now will remove this product&apos;s {savedCount} option{savedCount === 1 ? "" : "s"}. Turn options
          back on to keep them.
        </p>
      )}

      {enabled && (
        <div id="product-variants" tabIndex={-1} className="space-y-3 outline-none">
          <ol className="space-y-3">
            {rows.map((row, index) => {
              const adjustment = rowAdjustment(row);
              const nameError = errors[`variants.${index}.name`];
              const amountError = errors[`variants.${index}.amount`];
              return (
                <li
                  key={row.key}
                  className={cn(
                    "space-y-3 rounded-xl border bg-card p-3.5 transition-opacity sm:p-4",
                    !row.isActive && "bg-muted/40",
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <label htmlFor={variantFieldId(index, "name")} className="sr-only">
                        Option {index + 1} name
                      </label>
                      <Input
                        id={variantFieldId(index, "name")}
                        value={row.name}
                        onChange={(e) => patch(index, { name: e.target.value })}
                        placeholder={EXAMPLES[index] ?? "e.g. Large"}
                        maxLength={60}
                        aria-invalid={nameError ? true : undefined}
                        className="h-11 text-base font-medium sm:text-sm"
                        onKeyDown={(e) => {
                          // Enter on the last row adds another — quick for long lists
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (index === rows.length - 1 && rows.length < MAX_VARIANTS) {
                              onRowsChange([...rows, newVariantRow()]);
                              focusRow(index + 1);
                            } else focusRow(index + 1);
                          }
                        }}
                      />
                      {nameError && <p className="text-sm text-destructive">{nameError}</p>}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-9"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={`Move option ${index + 1} up`}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 sm:size-9"
                        disabled={index === rows.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Move option ${index + 1} down`}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-11 hover:text-destructive sm:size-9"
                        onClick={() => onRowsChange(rows.filter((_, i) => i !== index))}
                        aria-label={`Remove option ${index + 1}`}
                      >
                        <X />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div
                      role="radiogroup"
                      aria-label={`Price for option ${index + 1}`}
                      className="grid shrink-0 grid-cols-3 rounded-lg bg-muted p-1"
                    >
                      {PRICE_CHANGES.map((change) => (
                        <button
                          key={change}
                          type="button"
                          role="radio"
                          aria-checked={row.priceChange === change}
                          onClick={() => {
                            patch(index, { priceChange: change });
                            if (change !== "same") {
                              requestAnimationFrame(() => document.getElementById(variantFieldId(index, "amount"))?.focus());
                            }
                          }}
                          className={cn(
                            "h-9 rounded-md px-2.5 text-xs font-medium whitespace-nowrap transition-colors sm:text-sm",
                            row.priceChange === change
                              ? "bg-card text-foreground shadow-soft"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {PRICE_CHANGE_LABELS[change]}
                        </button>
                      ))}
                    </div>

                    {row.priceChange !== "same" && (
                      <div className="space-y-1.5 sm:w-40">
                        <div className="relative">
                          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                            {row.priceChange === "more" ? "+" : "−"} GH₵
                          </span>
                          <Input
                            id={variantFieldId(index, "amount")}
                            value={row.amount}
                            onChange={(e) => patch(index, { amount: e.target.value })}
                            inputMode="decimal"
                            autoComplete="off"
                            placeholder="0.00"
                            aria-label={`How much ${row.priceChange} for option ${index + 1}`}
                            aria-invalid={amountError ? true : undefined}
                            className="numeric h-11 pl-16 text-base sm:h-9 sm:text-sm"
                          />
                        </div>
                      </div>
                    )}

                    <p className="numeric text-sm text-muted-foreground sm:ml-auto sm:pt-2 sm:text-right">
                      {basePrice === null ? (
                        "Set the selling price to see this"
                      ) : adjustment === null ? (
                        "Enter an amount"
                      ) : (
                        <>
                          Customers pay{" "}
                          <strong className="font-semibold text-foreground">
                            {formatGHS(variantPrice(basePrice, adjustment))}
                          </strong>
                        </>
                      )}
                    </p>
                  </div>
                  {amountError && <p className="text-sm text-destructive">{amountError}</p>}

                  <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm">
                    <Switch
                      size="sm"
                      checked={row.isActive}
                      onCheckedChange={(isActive) => patch(index, { isActive })}
                      aria-label={`Option ${index + 1} available`}
                    />
                    <span className={cn(!row.isActive && "text-muted-foreground")}>
                      {row.isActive ? "Available" : "Not available right now — customers see it greyed out"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ol>

          {errors.variants && (
            <p role="alert" className="text-sm text-destructive">
              {errors.variants}
            </p>
          )}

          {rows.length < MAX_VARIANTS && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onRowsChange([...rows, newVariantRow()]);
                focusRow(rows.length);
              }}
            >
              <Plus data-icon="inline-start" /> Add another option
            </Button>
          )}
          <p className="text-sm text-muted-foreground">
            Tip: press Enter in the last name box to add the next option. Use the arrows to change the order
            customers see them in.
          </p>
        </div>
      )}
    </div>
  );
}
