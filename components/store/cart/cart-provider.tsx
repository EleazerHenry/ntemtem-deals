"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addToCart } from "@/app/(store)/cart/actions";
import type { CartView } from "@/lib/cart";

type CartContextValue = {
  /** null while the first load is in flight */
  cart: CartView | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Line to highlight after an add */
  justAdded: string | null;
  add: (productId: string, variantId: string | null, quantity: number) => Promise<boolean>;
  setQuantity: (lineId: string, quantity: number) => void;
  remove: (lineId: string) => void;
  /** Reload from the server (e.g. after checkout emptied it) */
  refresh: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// Changes still unsent when the page was left, re-applied on the next page load
const PENDING_KEY = "ntd_cart_pending";

function readPending(): [string, number][] {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (Object.entries(JSON.parse(raw)) as [string, number][]) : [];
  } catch {
    return [];
  }
}

async function patchLine(lineId: string, quantity: number, keepalive = false) {
  const res = await fetch("/api/cart", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineId, quantity }),
    keepalive,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error);
  return data as CartView;
}

async function fetchCart(): Promise<CartView | null> {
  try {
    const res = await fetch("/api/cart", { cache: "no-store" });
    return res.ok ? ((await res.json()) as CartView) : null;
  } catch {
    return null; // offline — keep what we have
  }
}

/** Recompute totals after an optimistic change, the same way the server does. */
function withLines(cart: CartView, lines: CartView["lines"]): CartView {
  const ok = lines.filter((l) => !l.unavailable);
  return {
    lines,
    count: ok.reduce((n, l) => n + l.quantity, 0),
    subtotal: round2(ok.reduce((s, l) => s + l.lineTotal, 0)),
    savings: round2(ok.reduce((s, l) => s + (l.compareAtUnit ? (l.compareAtUnit - l.unitPrice) * l.quantity : 0), 0)),
    // The server reply that follows settles this if a removed line changed it
    deliveryEstimate: ok.length ? cart.deliveryEstimate : null,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartView | null>(null);
  const [open, setOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // Only the newest request may overwrite what's on screen
  const latest = useRef(0);
  // Per line: the quantity waiting to be sent, and its timer (rapid taps become one request)
  const queued = useRef(new Map<string, { quantity: number; timer: ReturnType<typeof setTimeout> }>());
  const inFlight = useRef(0);

  const refresh = useCallback(() => {
    const ticket = ++latest.current;
    fetchCart().then((data) => {
      if (data && ticket === latest.current) setCart(data);
    });
  }, []);

  useEffect(() => {
    const pending = readPending();
    if (pending.length) {
      // Setting an absolute quantity twice is harmless, so just send them again first
      const ticket = ++latest.current;
      Promise.allSettled(pending.map(([lineId, quantity]) => patchLine(lineId, quantity)))
        .then(() => fetchCart())
        .then((data) => {
          if (data && ticket === latest.current) setCart(data);
        });
    } else {
      refresh();
    }
    // Another tab may have changed the cart
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const add = useCallback(async (productId: string, variantId: string | null, quantity: number) => {
    const ticket = ++latest.current;
    const result = await addToCart({ productId, variantId, quantity });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    if (ticket === latest.current) setCart(result.cart);
    setJustAdded(result.lineId);
    setOpen(true);
    if (result.capped) toast.info("You can order up to 10 of each item — we've set it to 10.");
    return true;
  }, []);

  const send = useCallback(
    (lineId: string, quantity: number) => {
      queued.current.delete(lineId);
      inFlight.current++;
      const ticket = ++latest.current;
      // keepalive: the change still reaches the server if the page is closed or reloaded
      patchLine(lineId, quantity, true)
        .then((data) => {
          // Only show the server's view once nothing else is pending — no flicker back
          if (ticket === latest.current && inFlight.current === 1 && queued.current.size === 0) setCart(data);
        })
        .catch((error: Error) => {
          toast.error(error.message || "Couldn't update your cart. Please try again.");
          refresh();
        })
        .finally(() => inFlight.current--);
    },
    [refresh],
  );

  const change = useCallback(
    (lineId: string, quantity: number) => {
      // Show it immediately…
      setCart((current) => {
        if (!current) return current;
        const lines =
          quantity <= 0
            ? current.lines.filter((l) => l.id !== lineId)
            : current.lines.map((l) => (l.id === lineId ? { ...l, quantity, lineTotal: round2(l.unitPrice * quantity) } : l));
        return withLines(current, lines);
      });
      // …and send only the final number once tapping stops (removals go straight away)
      const pending = queued.current.get(lineId);
      if (pending) clearTimeout(pending.timer);
      if (quantity <= 0) return send(lineId, 0);
      queued.current.set(lineId, { quantity, timer: setTimeout(() => send(lineId, quantity), 350) });
    },
    [send],
  );

  // Leaving the page with a change still waiting: send it now (keepalive carries it)
  useEffect(() => {
    const flush = () => {
      const unsent: Record<string, number> = {};
      queued.current.forEach(({ quantity, timer }, lineId) => {
        clearTimeout(timer);
        unsent[lineId] = quantity;
        send(lineId, quantity);
      });
      try {
        if (Object.keys(unsent).length) sessionStorage.setItem(PENDING_KEY, JSON.stringify(unsent));
      } catch {
        /* storage blocked — keepalive alone usually suffices */
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [send]);

  return (
    <CartContext.Provider
      value={{
        cart,
        open,
        setOpen: (next) => {
          setOpen(next);
          if (!next) setJustAdded(null);
        },
        justAdded,
        add,
        setQuantity: change,
        remove: (lineId) => change(lineId, 0),
        refresh,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
