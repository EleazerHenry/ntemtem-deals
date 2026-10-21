"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ImageIcon, Loader2, Lock, MapPin, ShoppingBag, Store, Tag, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { applyCoupon, placeOrder } from "@/app/(store)/checkout/actions";
import { ArrivalNote } from "@/components/store/arrival-note";
import { useCart } from "@/components/store/cart/cart-provider";
import { ProductImage } from "@/components/store/product-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { checkoutFieldErrors, checkoutSchema, type CheckoutFieldErrors, type CheckoutInput } from "@/lib/validations/checkout";

type Zone = { city: string; deliveryFee: number; estimatedDays: string; isPickup: boolean };
type Applied = { code: string; discount: number; label: string };

const round2 = (n: number) => Math.round(n * 100) / 100;
const FIELD_ORDER: (keyof CheckoutInput)[] = ["fullName", "phone", "email", "city", "area", "landmark", "couponCode"];

export function CheckoutForm({
  zones,
  signedIn,
  paymentsEnabled,
  prefill,
}: {
  zones: Zone[];
  signedIn: boolean;
  /** Paystack is set up — go straight to payment after placing the order */
  paymentsEnabled: boolean;
  prefill: { fullName: string; email: string; phone: string; city?: string; area?: string; landmark?: string };
}) {
  const router = useRouter();
  const { cart, setOpen, refresh } = useCart();
  const [form, setForm] = useState({
    fullName: prefill.fullName,
    email: prefill.email,
    phone: prefill.phone,
    city: prefill.city ?? "",
    method: "delivery" as "delivery" | "pickup",
    area: prefill.area ?? "",
    landmark: prefill.landmark ?? "",
  });
  const [errors, setErrors] = useState<CheckoutFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [checkingCode, startCheckingCode] = useTransition();
  const [placing, startPlacing] = useTransition();
  const [leaving, setLeaving] = useState(false);
  // Back from Paystack lands here with an empty cart — show the unpaid order instead
  const emptyCart = cart?.lines.length === 0;
  useEffect(() => {
    const back = () => {
      const pending = readPendingOrder();
      if (pending) window.location.replace(pending);
    };
    if (emptyCart) back();
    const onShow = (e: PageTransitionEvent) => e.persisted && back(); // restored from the browser cache
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [emptyCart]);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const zone = zones.find((z) => z.city === form.city);
  const deliveryFee = !zone ? null : form.method === "pickup" ? 0 : zone.deliveryFee;
  const subtotal = cart?.subtotal ?? 0;
  const discount = applied?.discount ?? 0;
  const total = round2(Math.max(0, subtotal - discount) + (deliveryFee ?? 0));
  const unavailable = cart?.lines.some((l) => l.unavailable);

  // A cart change can change the discount (or make the code invalid) — re-check it
  useEffect(() => {
    if (!applied || !cart) return;
    let stale = false;
    applyCoupon(applied.code).then((r) => {
      if (stale) return;
      if (r.ok) setApplied(r);
      else {
        setApplied(null);
        toast.info(r.error);
      }
    });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the subtotal moves
  }, [subtotal]);

  const set = (patch: Partial<typeof form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => Object.fromEntries(Object.entries(e).filter(([k]) => !(k in patch))));
  };

  function chooseCity(city: string) {
    const z = zones.find((x) => x.city === city);
    set({ city, method: z?.isPickup ? form.method : "delivery" });
  }

  function onApplyCode() {
    const code = codeInput.trim();
    if (!code) return;
    startCheckingCode(async () => {
      const r = await applyCoupon(code);
      if (r.ok) {
        setApplied(r);
        setCodeInput("");
        setErrors((e) => ({ ...e, couponCode: undefined }));
      } else {
        setErrors((e) => ({ ...e, couponCode: r.error }));
      }
    });
  }

  function focusFirst(found: CheckoutFieldErrors) {
    const first = FIELD_ORDER.find((f) => found[f]);
    if (!first) return;
    const el = document.getElementById(`co-${first}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.focus({ preventScroll: true });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError("");
    const input: CheckoutInput = { ...form, couponCode: applied?.code ?? "", expectedTotal: total };
    const check = checkoutSchema.safeParse(input);
    if (!check.success) {
      const found = checkoutFieldErrors(check.error);
      setErrors(found);
      focusFirst(found);
      return;
    }
    startPlacing(async () => {
      const result = await placeOrder(input);
      if (result.ok) {
        // Straight to Paystack; the order page (with its pay button) is the fallback
        const payUrl = paymentsEnabled ? await startPayment(result.orderNumber, result.orderKey) : null;
        if (payUrl) {
          rememberPendingOrder(result.redirectTo);
          setLeaving(true);
          window.location.assign(payUrl); // the cart reloads (empty) on the way back
        } else {
          setLeaving(true); // keep the form up (not "cart is empty") until the order page opens
          refresh(); // the server emptied the cart
          router.push(result.redirectTo);
        }
        return;
      }
      if (result.fieldErrors) {
        setErrors(result.fieldErrors);
        focusFirst(result.fieldErrors);
        if (result.fieldErrors.couponCode) setApplied(null);
      }
      if (result.formError) setFormError(result.formError);
      if (result.cartChanged) refresh();
    });
  }

  if (cart && cart.lines.length === 0 && !leaving) {
    return (
      <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShoppingBag className="size-7" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold">Your cart is empty</h2>
        <p className="mt-2 text-muted-foreground">Add something you love, then come back to check out.</p>
        <Button asChild size="lg" className="mt-6">
          <Link href="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  const summary = (
    <Summary
      cart={cart}
      zone={zone}
      deliveryFee={deliveryFee}
      method={form.method}
      applied={applied}
      total={total}
      codeInput={codeInput}
      onCodeInput={setCodeInput}
      onApplyCode={onApplyCode}
      onRemoveCode={() => setApplied(null)}
      checkingCode={checkingCode}
      codeError={errors.couponCode}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
      {/* Phone: collapsible summary first, like most good checkouts */}
      <div className="-mx-4 border-y bg-muted/40 px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          className="flex h-14 w-full items-center justify-between text-sm font-medium"
          aria-expanded={summaryOpen}
        >
          <span className="flex items-center gap-2 text-brand-800">
            <ShoppingBag className="size-4" /> {summaryOpen ? "Hide" : "Show"} order summary
            <ChevronDown className={cn("size-4 transition-transform", summaryOpen && "rotate-180")} />
          </span>
          <span className="text-right leading-tight">
            <span className="numeric block font-heading text-lg font-bold">{cart ? formatPrice(total) : "…"}</span>
            {cart && cart.savings + (applied?.discount ?? 0) > 0 && (
              <span className="numeric block text-xs font-semibold text-success">Saving {formatPrice(cart.savings + (applied?.discount ?? 0))}</span>
            )}
          </span>
        </button>
        {summaryOpen && <div className="pb-5">{summary}</div>}
      </div>

      <div className="space-y-10">
        <Section step="1" title="Your details" hint={signedIn ? undefined : "No account needed — you can save your details after ordering."}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="co-fullName" label="Full name" value={form.fullName} onChange={(v) => set({ fullName: v })} error={errors.fullName} autoComplete="name" className="sm:col-span-2" />
            <TextField
              id="co-phone"
              label="Phone number"
              value={form.phone}
              onChange={(v) => set({ phone: v })}
              error={errors.phone}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="024 123 4567"
              hint="For delivery updates and the rider's call."
            />
            <TextField
              id="co-email"
              label="Email"
              value={form.email}
              onChange={(v) => set({ email: v })}
              error={errors.email}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@gmail.com"
              hint="We send your receipt and tracking here."
            />
          </div>
        </Section>

        <Section step="2" title="Delivery">
          <fieldset>
            <legend className="mb-3 text-sm font-medium">City</legend>
            <div id="co-city" tabIndex={-1} role="radiogroup" aria-label="City" className="grid grid-cols-2 gap-3 outline-none">
              {zones.map((z) => (
                <button
                  key={z.city}
                  type="button"
                  role="radio"
                  aria-checked={form.city === z.city}
                  onClick={() => chooseCity(z.city)}
                  className={cn(
                    "rounded-2xl border bg-card p-4 text-left transition-colors",
                    form.city === z.city ? "border-ink ring-2 ring-ink" : "hover:border-foreground/30",
                    errors.city && "border-destructive",
                  )}
                >
                  <span className="flex items-center gap-1.5 font-semibold">
                    <MapPin className="size-4 text-brand-700" /> {z.city}
                  </span>
                  <span className="numeric mt-1 block text-sm text-muted-foreground">Delivery {formatPrice(z.deliveryFee)}</span>
                  {z.isPickup && <span className="mt-1 block text-xs font-medium text-success">Free pickup available</span>}
                </button>
              ))}
            </div>
            {errors.city && <p className="mt-2 text-sm text-destructive">{errors.city}</p>}
          </fieldset>

          {zone?.isPickup && (
            <div role="radiogroup" aria-label="Delivery or pickup" className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "delivery", icon: Truck, title: "Deliver to me", note: formatPrice(zone.deliveryFee) },
                  { value: "pickup", icon: Store, title: "I'll pick it up", note: "Free" },
                ] as const
              ).map(({ value, icon: Icon, title, note }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={form.method === value}
                  onClick={() => set({ method: value })}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border bg-card p-4 text-left",
                    form.method === value ? "border-ink ring-2 ring-ink" : "hover:border-foreground/30",
                  )}
                >
                  <Icon className="size-5 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="numeric block text-xs text-muted-foreground">{note}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {form.method === "pickup" ? (
            <p className="rounded-2xl bg-success/10 px-4 py-3 text-sm text-success">
              We&apos;ll call or WhatsApp you when your order reaches {form.city} with the pickup point and opening hours.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                id="co-area"
                label="Area or neighbourhood"
                value={form.area}
                onChange={(v) => set({ area: v })}
                error={errors.area}
                autoComplete="address-level3"
                placeholder={form.city === "Kumasi" ? "e.g. Ahodwo" : "e.g. East Legon"}
              />
              <TextField
                id="co-landmark"
                label="Landmark"
                optional
                value={form.landmark}
                onChange={(v) => set({ landmark: v })}
                error={errors.landmark}
                placeholder="e.g. near the blue kiosk, opposite the school"
                hint="Helps the rider find you faster."
              />
            </div>
          )}
          {zone && cart?.deliveryEstimate && (
            <ArrivalNote estimate={cart.deliveryEstimate} pickupCity={form.method === "pickup" ? zone.city : undefined} />
          )}
        </Section>

        <div className="space-y-3">
          {unavailable && (
            <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              Some items in your cart are no longer available.{" "}
              <button type="button" onClick={() => setOpen(true)} className="font-semibold underline">
                Open your cart
              </button>{" "}
              to remove them.
            </p>
          )}
          {formError && (
            <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {formError}
            </p>
          )}
          <Button type="submit" size="xl" className="h-14 w-full text-base" disabled={placing || leaving || !cart || !!unavailable}>
            {placing || leaving ? (
              <>
                <Loader2 className="animate-spin" data-icon="inline-start" /> {paymentsEnabled ? "Opening secure payment…" : "Placing your order…"}
              </>
            ) : (
              <>
                <Lock data-icon="inline-start" />
                {paymentsEnabled ? (zone && cart ? `Pay ${formatPrice(total)} securely` : "Pay securely") : `Place order${zone && cart ? ` · ${formatPrice(total)}` : ""}`}
              </>
            )}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {paymentsEnabled
              ? "Mobile Money or card, on Paystack's secure page — then you come straight back."
              : "We'll save your order and contact you about paying."}
          </p>
          <p className="text-center text-xs text-muted-foreground">
            How we use and protect your details:{" "}
            {/* New tab, so the filled-in form isn't lost */}
            <Link href="/policies/privacy" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-36 rounded-3xl border bg-card p-6 shadow-soft">
          <h2 className="mb-5 font-sans text-base font-semibold tracking-normal">Order summary</h2>
          {summary}
        </div>
      </aside>
    </form>
  );
}

function Section({ step, title, hint, children }: { step: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5">
      <div className="flex items-baseline gap-3">
        <span className="numeric grid size-7 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-paper">{step}</span>
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  optional,
  className,
  ...input
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange">) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-medium">
        {label} {optional && <span className="text-xs font-normal text-muted-foreground">Optional</span>}
      </label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-msg`}
        className="h-12 text-base"
        {...input}
      />
      {(error || hint) && (
        <p id={`${id}-msg`} className={cn("text-sm", error ? "text-destructive" : "text-muted-foreground")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

const PENDING_KEY = "ntd_pending_order";
function rememberPendingOrder(path: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, path);
  } catch {}
}
/** The order this tab just left for Paystack — read once, then forgotten. */
function readPendingOrder() {
  try {
    const path = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return path?.startsWith("/order/") ? path : null;
  } catch {
    return null;
  }
}

/** Creates the Paystack transaction; null if it can't start (the order page then offers to retry). */
async function startPayment(orderNumber: string, key: string): Promise<string | null> {
  try {
    const res = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber, key }),
    });
    const data = await res.json();
    return res.ok && typeof data.authorizationUrl === "string" ? data.authorizationUrl : null;
  } catch {
    return null;
  }
}

function Summary({
  cart,
  zone,
  deliveryFee,
  method,
  applied,
  total,
  codeInput,
  onCodeInput,
  onApplyCode,
  onRemoveCode,
  checkingCode,
  codeError,
}: {
  cart: ReturnType<typeof useCart>["cart"];
  zone: Zone | undefined;
  deliveryFee: number | null;
  method: "delivery" | "pickup";
  applied: Applied | null;
  total: number;
  codeInput: string;
  onCodeInput: (v: string) => void;
  onApplyCode: () => void;
  onRemoveCode: () => void;
  checkingCode: boolean;
  codeError?: string;
}) {
  if (!cart) return <p className="text-sm text-muted-foreground">Loading your cart…</p>;
  return (
    <div className="space-y-5">
      <ul className="space-y-4">
        {cart.lines.map((l) => (
          <li key={l.id} className={cn("flex gap-3", l.unavailable && "opacity-50")}>
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              {l.image ? <ProductImage src={l.image} alt="" fill sizes="64px" className="object-cover" /> : <ImageIcon className="absolute inset-0 m-auto size-5 text-muted-foreground" />}
              <span className="numeric absolute -top-0 -right-0 grid h-5 min-w-5 place-items-center rounded-bl-lg bg-ink px-1 text-[0.7rem] font-bold text-paper">
                {l.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1 text-sm">
              <p className="line-clamp-2 leading-snug font-medium">{l.name}</p>
              {l.variantName && <p className="text-xs text-muted-foreground">{l.variantName}</p>}
              {l.unavailable && <p className="text-xs text-destructive">No longer available</p>}
            </div>
            <div className="shrink-0 text-right">
              <p className="numeric text-sm font-medium">{formatPrice(l.lineTotal)}</p>
              {l.compareAtUnit && !l.unavailable && (
                <p className="numeric text-xs text-muted-foreground line-through">{formatPrice(l.compareAtUnit * l.quantity)}</p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <div className="space-y-2 border-t pt-4">
        {applied ? (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 px-3 py-2.5 text-sm">
            <span className="flex items-center gap-2 font-medium text-success">
              <Tag className="size-4" /> {applied.code} · {applied.label}
            </span>
            <button type="button" onClick={onRemoveCode} className="grid size-8 place-items-center rounded-lg hover:bg-success/15" aria-label="Remove discount code">
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input
                id="co-couponCode"
                value={codeInput}
                onChange={(e) => onCodeInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onApplyCode();
                  }
                }}
                placeholder="Discount code"
                aria-label="Discount code"
                aria-invalid={codeError ? true : undefined}
                autoCapitalize="characters"
                className="h-11 uppercase placeholder:normal-case"
              />
              <Button type="button" variant="secondary" className="h-11 px-5" onClick={onApplyCode} disabled={checkingCode || !codeInput.trim()}>
                {checkingCode ? <Loader2 className="animate-spin" /> : "Apply"}
              </Button>
            </div>
            {codeError && <p className="text-sm text-destructive">{codeError}</p>}
          </>
        )}
      </div>

      <dl className="space-y-2 border-t pt-4 text-sm">
        <Row label="Subtotal" value={formatPrice(cart.subtotal)} />
        {applied && <Row label={`Discount (${applied.code})`} value={`−${formatPrice(applied.discount)}`} className="text-success" />}
        <Row
          label={method === "pickup" ? "Pickup" : zone ? `Delivery to ${zone.city}` : "Delivery"}
          value={deliveryFee === null ? "Choose your city" : deliveryFee === 0 ? "Free" : formatPrice(deliveryFee)}
          muted={deliveryFee === null}
        />
        <div className="flex items-baseline justify-between border-t pt-3">
          <dt className="font-semibold">Total</dt>
          <dd className="numeric font-heading text-2xl font-bold">{formatPrice(total)}</dd>
        </div>
      </dl>
      {cart.savings + (applied?.discount ?? 0) > 0 && (
        <p className="-mt-3 text-right text-sm font-semibold text-success">
          You&apos;re saving <span className="numeric">{formatPrice(cart.savings + (applied?.discount ?? 0))}</span> on this order
        </p>
      )}
      {cart.deliveryEstimate && <ArrivalNote estimate={cart.deliveryEstimate} pickupCity={method === "pickup" ? zone?.city : undefined} />}
    </div>
  );
}

function Row({ label, value, muted, className }: { label: string; value: string; muted?: boolean; className?: string }) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt className={cn(!className && "text-muted-foreground")}>{label}</dt>
      <dd className={cn("numeric font-medium", muted && "text-muted-foreground")}>{value}</dd>
    </div>
  );
}
