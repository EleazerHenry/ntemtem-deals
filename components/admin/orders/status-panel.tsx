"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, MessageSquarePlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { addOrderNote, advanceOrder, cancelOrder } from "@/app/admin/(panel)/orders/actions";
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
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_STEP, STEP_COPY, nextStatus, type OrderStatusValue } from "@/lib/order-status";

export function StatusPanel({ orderId, status }: { orderId: string; status: OrderStatusValue }) {
  const router = useRouter();
  const next = nextStatus(status);
  const step = ADMIN_STEP[status];
  const [noteText, setNoteText] = useState(step.defaultNote ?? "");
  const [update, setUpdate] = useState("");
  const [internal, setInternal] = useState(false);
  const [reason, setReason] = useState("");
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        after?.();
        router.refresh();
      } else toast.error(r.error);
    });

  const advance = () => run(() => advanceOrder(orderId, status, noteText), () => setConfirmPaid(false));

  return (
    <div className="space-y-6">
      {next ? (
        <section className="rounded-2xl border border-ink bg-card p-5 shadow-soft sm:p-6">
          <h2 className="font-sans text-base font-semibold tracking-normal">Next step</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Now: <strong className="text-foreground">{step.label}</strong>. The customer&apos;s page will change to “{STEP_COPY[next].headline}”.
          </p>
          <label htmlFor="advance-note" className="mt-4 mb-1.5 block text-sm font-medium">
            Note for the customer
          </label>
          <Textarea id="advance-note" value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={500} className="min-h-20 text-base sm:text-sm" />
          <p className="mt-1 text-xs text-muted-foreground">Shown on their tracking page. Edit it or leave it as is.</p>
          <Button size="xl" className="mt-4 w-full" disabled={pending} onClick={() => (status === "PENDING" ? setConfirmPaid(true) : advance())}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ArrowRight data-icon="inline-start" />}
            {step.advance}
          </Button>
        </section>
      ) : (
        <section className="rounded-2xl border bg-muted/40 p-5 text-sm">
          <p className="font-semibold">{status === "DELIVERED" ? "Delivered — all done." : "This order is cancelled."}</p>
          <p className="mt-1 text-muted-foreground">You can still add a note below.</p>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
          <MessageSquarePlus className="size-4" /> Add an update
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">For news without a new step, e.g. “Held at customs — 2 more days”.</p>
        <Textarea value={update} onChange={(e) => setUpdate(e.target.value)} maxLength={500} placeholder="Write an update…" aria-label="Update" className="mt-3 min-h-20 text-base sm:text-sm" />
        <label className="mt-3 flex items-center gap-2.5 text-sm">
          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="size-4 accent-[var(--color-ink)]" />
          Private note (only you see it)
        </label>
        <Button variant="secondary" className="mt-3" disabled={pending || update.trim().length < 2} onClick={() => run(() => addOrderNote(orderId, update, internal), () => setUpdate(""))}>
          {internal ? "Save private note" : "Post update"}
        </Button>
      </section>

      {status !== "DELIVERED" && status !== "CANCELLED" && (
        <Button variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setConfirmCancel(true)}>
          <XCircle data-icon="inline-start" /> Cancel order
        </Button>
      )}

      <AlertDialog open={confirmPaid} onOpenChange={setConfirmPaid}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this order as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              Only do this if you received the money another way (e.g. Mobile Money sent to you directly). Paystack payments mark orders paid by themselves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not yet</AlertDialogCancel>
            <Button onClick={advance} disabled={pending}>
              {pending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              Yes, I&apos;ve been paid
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
            <AlertDialogDescription>The customer will see that it&apos;s cancelled, with the reason you give. If they paid, refund them in Paystack.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The supplier ran out of stock — we've refunded you." aria-label="Reason" className="min-h-20" />
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the order</AlertDialogCancel>
            <Button className="bg-destructive text-paper hover:bg-destructive/90" disabled={pending || reason.trim().length < 3} onClick={() => run(() => cancelOrder(orderId, reason), () => setConfirmCancel(false))}>
              Cancel order
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
