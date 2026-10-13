import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { METHOD_LABEL, fmtDateTime, money, orderNo } from "@/lib/format";
import type { Fulfillment, Order, OrderStatus, Settings } from "@/lib/types";

const STATUS_STYLE: Record<OrderStatus, string> = {
  unpaid: "bg-amber-50 text-amber-900 border-amber-300",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-300",
  cancelled: "bg-stone-100 text-stone-600 border-stone-300",
};
const STATUS_TEXT: Record<OrderStatus, string> = { unpaid: "Unpaid", paid: "Paid", cancelled: "Cancelled" };

export function StatusBadge({ status, testId }: { status: OrderStatus; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider", STATUS_STYLE[status])}
    >
      {STATUS_TEXT[status]}
    </span>
  );
}

export function FulfillmentBadge({ value, testId }: { value: Fulfillment; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider",
        value === "served" ? "bg-sky-50 text-sky-800 border-sky-300" : "bg-bean text-white border-bean",
      )}
    >
      {value === "served" ? "Served" : "New"}
    </span>
  );
}

/** Billing statement / official receipt. Staff-only: rendered in cashier and admin screens. */
export default function ReceiptView({ order, settings }: { order: Order; settings: Settings }) {
  const isPaid = order.status === "paid";
  const line = "my-3 border-t border-dashed border-[#CDB49E]";
  return (
    <div className="bg-white font-mono text-[13px] text-espresso rounded-2xl border border-dashed border-[#CDB49E] p-5" data-testid="receipt-view">
      <div className="space-y-0.5 text-center">
        <img src={settings.logo_url || "/brand/logo.png"} alt="" className="mx-auto mb-1 h-16 w-16 object-contain" />
        <p className="text-base font-bold" style={{ fontFamily: "var(--font-heading)" }}>{settings.shop_name}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{settings.tagline}</p>
        <p className="pt-2 text-xs font-bold uppercase tracking-widest" data-testid="receipt-title">
          {isPaid ? "Official Receipt" : "Billing Statement"}
        </p>
      </div>
      <div className={line} />
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <span>Order</span>
        <span className="text-right font-bold" data-testid="receipt-order-number">{orderNo(order.order_number)}</span>
        <span>Table</span>
        <span className="text-right font-bold" data-testid="receipt-table">#{order.table_number}{order.table_label && ` (${order.table_label})`}</span>
        <span>Customer</span>
        <span className="truncate text-right">{order.nickname}</span>
        <span>Date</span>
        <span className="text-right">{fmtDateTime(order.created_at)}</span>
      </div>
      <div className={line} />
      <div className="space-y-1.5">
        {order.items.map((it) => (
          <div key={it.product_id} className="text-xs">
            <div className="flex justify-between gap-2">
              <span className="min-w-0 break-words">{it.name}</span>
              <span className="shrink-0">{money(it.subtotal)}</span>
            </div>
            <div className="text-muted-foreground">{it.qty} x {money(it.price)}</div>
          </div>
        ))}
      </div>
      {order.notes && (
        <p className="mt-2 rounded-lg bg-cream px-2 py-1 text-[11px]"><span className="font-bold">Notes:</span> {order.notes}</p>
      )}
      <div className={line} />
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between"><span>Items</span><span>{order.item_count}</span></div>
        <div className="flex justify-between text-base font-bold"><span>TOTAL</span><span data-testid="receipt-total">{money(order.total)}</span></div>
        <div className="flex justify-between"><span>Payment</span><span>{METHOD_LABEL[order.payment_method]}</span></div>
        {order.payment_reference && (
          <div className="flex justify-between gap-3"><span>Reference</span><span className="truncate">{order.payment_reference}</span></div>
        )}
        {isPaid && order.amount_tendered != null && (
          <>
            <div className="flex justify-between"><span>Tendered</span><span>{money(order.amount_tendered)}</span></div>
            <div className="flex justify-between"><span>Change</span><span data-testid="receipt-change">{money(order.change ?? 0)}</span></div>
          </>
        )}
        {isPaid && <div className="flex justify-between"><span>Cashier</span><span>{order.processed_by}</span></div>}
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <StatusBadge status={order.status} testId="receipt-status" />
        <FulfillmentBadge value={order.fulfillment} />
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">{settings.receipt_footer}</p>
    </div>
  );
}

export function ReceiptDialog({ order, settings, onClose }: { order: Order | null; settings: Settings; onClose: () => void }) {
  return (
    <Dialog open={!!order} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl bg-cream sm:max-w-sm" data-testid="receipt-dialog">
        <DialogHeader className="no-print">
          <DialogTitle>{order?.status === "paid" ? "Official receipt" : "Billing statement"}</DialogTitle>
          <DialogDescription>Print and hand this to the customer.</DialogDescription>
        </DialogHeader>
        {order && (
          <div className="print-area">
            <ReceiptView order={order} settings={settings} />
          </div>
        )}
        <Button onClick={() => window.print()} className="no-print rounded-full bg-bean hover:bg-bean-dark" data-testid="receipt-print-button">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </DialogContent>
    </Dialog>
  );
}
