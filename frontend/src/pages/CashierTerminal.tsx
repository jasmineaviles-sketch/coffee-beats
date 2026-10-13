import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  Banknote,
  CheckCircle2,
  ConciergeBell,
  CreditCard,
  FileText,
  Loader2,
  LogOut,
  MessageSquareText,
  RefreshCw,
  Smartphone,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import BrandMark from "@/components/BrandMark";
import { FulfillmentBadge, ReceiptDialog, StatusBadge } from "@/components/ReceiptView";
import StaffLogin from "@/components/StaffLogin";
import { apiGet, apiPost } from "@/lib/api";
import { METHOD_LABEL, fmtDateTime, fmtTime, money, orderNo } from "@/lib/format";
import { errorText, useMe, useSettings } from "@/lib/queries";
import { endSession } from "@/lib/session";
import type { DiningTable, Order, PayIn, PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "new" | "unpaid" | "served" | "paid" | "cancelled" | "all";
const FILTERS: { id: Filter; label: string; query: string }[] = [
  { id: "new", label: "New orders", query: "fulfillment=new" },
  { id: "unpaid", label: "Unpaid", query: "status=unpaid" },
  { id: "served", label: "Served", query: "fulfillment=served" },
  { id: "paid", label: "Paid", query: "status=paid" },
  { id: "cancelled", label: "Cancelled", query: "status=cancelled" },
  { id: "all", label: "All", query: "" },
];
const METHOD_ICON = { cash: Banknote, gcash: Smartphone, card: CreditCard } as const;

function useIsDesktop() {
  const [v, setV] = useState(() => window.matchMedia("(min-width: 1024px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setV(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return v;
}

function Row({ label, children, testId }: { label: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold" data-testid={testId}>{children}</span>
    </div>
  );
}

function OrderDetail({ order, onPrint, onClose }: { order: Order; onPrint: (o: Order) => void; onClose?: () => void }) {
  const qc = useQueryClient();
  const [method, setMethod] = useState<PaymentMethod>(order.payment_method);
  const [tendered, setTendered] = useState("");
  const [reference, setReference] = useState(order.payment_reference);
  const tenderedNum = tendered === "" ? order.total : Number(tendered);
  const change = tenderedNum - order.total;

  const after = (msg: string) => {
    qc.invalidateQueries({ queryKey: ["staff-orders"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success(msg);
  };
  const onErr = (e: unknown) => {
    qc.invalidateQueries({ queryKey: ["staff-orders"] });
    toast.error(errorText(e, "Action failed"));
  };
  const pay = useMutation({
    mutationFn: (b: PayIn) => apiPost<Order>(`/staff/orders/${order.id}/pay`, b),
    onSuccess: (o) => after(`Payment confirmed for ${orderNo(o.order_number)}`),
    onError: onErr,
  });
  const serve = useMutation({
    mutationFn: () => apiPost<Order>(`/staff/orders/${order.id}/serve`),
    onSuccess: (o) => after(`${orderNo(o.order_number)} marked as served`),
    onError: onErr,
  });
  const cancel = useMutation({
    mutationFn: () => apiPost<Order>(`/staff/orders/${order.id}/cancel`),
    onSuccess: (o) => after(`${orderNo(o.order_number)} cancelled`),
    onError: onErr,
  });
  const busy = pay.isPending || serve.isPending || cancel.isPending;
  const canServe = order.status !== "cancelled" && order.fulfillment !== "served";

  return (
    <div className="space-y-4" data-testid="cashier-order-detail">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground" data-testid="cashier-detail-order-number">
            Order {orderNo(order.order_number)}
          </p>
          <h2 className="font-heading text-3xl font-semibold" data-testid="cashier-detail-table">Table #{order.table_number}</h2>
          {order.table_label && <p className="text-xs font-semibold text-bean">{order.table_label}</p>}
        </div>
        {onClose && (
          <button onClick={onClose} className="rounded-full p-1.5 transition-colors hover:bg-muted" aria-label="Close" data-testid="cashier-detail-close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="rounded-2xl border bg-white px-4 py-2 divide-y">
        <Row label="Customer" testId="cashier-detail-nickname">{order.nickname}</Row>
        <Row label="Date and time">{fmtDateTime(order.created_at)}</Row>
        <Row label="Payment method" testId="cashier-detail-method">{METHOD_LABEL[order.payment_method]}</Row>
        <Row label="Payment status"><StatusBadge status={order.status} testId="cashier-detail-status" /></Row>
        <Row label="Order status"><FulfillmentBadge value={order.fulfillment} testId="cashier-detail-fulfillment" /></Row>
        {order.payment_reference && <Row label="Reference">{order.payment_reference}</Row>}
      </div>

      {order.notes && (
        <div className="flex gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950" data-testid="cashier-detail-notes">
          <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="break-words"><span className="font-bold">Notes: </span>{order.notes}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border bg-white">
        <table className="w-full text-sm" data-testid="cashier-detail-items">
          <thead className="bg-latte text-left text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-bold">Item</th>
              <th className="px-2 py-2 text-center font-bold">Qty</th>
              <th className="px-2 py-2 text-right font-bold">Price</th>
              <th className="px-3 py-2 text-right font-bold">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items.map((it) => (
              <tr key={it.product_id}>
                <td className="px-3 py-2 font-medium break-words">{it.name}</td>
                <td className="px-2 py-2 text-center font-bold text-bean">{it.qty}</td>
                <td className="px-2 py-2 text-right text-muted-foreground whitespace-nowrap">{money(it.price)}</td>
                <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{money(it.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-cream">
              <td className="px-3 py-3 font-bold uppercase tracking-wider">Total</td>
              <td className="px-2 py-3 text-center font-bold">{order.item_count}</td>
              <td />
              <td className="px-3 py-3 text-right font-heading text-xl font-bold text-bean" data-testid="cashier-detail-total">{money(order.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {order.status === "unpaid" && (
        <div className="space-y-3 rounded-2xl border bg-white p-4" data-testid="cashier-payment-panel">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm payment after verifying it</p>
          <div className="grid grid-cols-3 gap-2">
            {(["cash", "gcash", "card"] as PaymentMethod[]).map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-full border-2 py-2 text-xs font-bold uppercase transition-[background-color,border-color,color]",
                    method === m ? "border-bean bg-bean text-white" : "border-[#DFCABB] hover:border-bean",
                  )}
                  data-testid={`cashier-pay-method-${m}`}
                >
                  <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{METHOD_LABEL[m]}</span>
                </button>
              );
            })}
          </div>
          {method === "cash" ? (
            <div className="space-y-2">
              <Label htmlFor="tendered">Amount received</Label>
              <Input
                id="tendered"
                type="number"
                min={0}
                inputMode="decimal"
                placeholder={order.total.toFixed(2)}
                value={tendered}
                onChange={(e) => setTendered(e.target.value)}
                className="h-11 rounded-xl text-lg font-bold"
                data-testid="cashier-tendered-input"
              />
              <div className="flex flex-wrap gap-2">
                {[Math.ceil(order.total), 500, 1000].filter((v, i, a) => a.indexOf(v) === i && v >= order.total).map((v) => (
                  <button
                    key={v}
                    onClick={() => setTendered(String(v))}
                    className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-bean transition-colors hover:bg-[#EAD8C4]"
                    data-testid={`cashier-quick-tender-${v}`}
                  >
                    {money(v)}
                  </button>
                ))}
              </div>
              <div className="flex justify-between rounded-xl bg-cream px-4 py-2 text-sm">
                <span>Change</span>
                <span className={cn("font-bold", change < 0 ? "text-destructive" : "text-emerald-700")} data-testid="cashier-change">
                  {Number.isNaN(change) ? "-" : change < 0 ? "Insufficient amount" : money(change)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="reference">{method === "gcash" ? "GCash verification note (optional)" : "Card approval / reference (optional)"}</Label>
              <Input id="reference" value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} className="h-11 rounded-xl" data-testid="cashier-reference-input" />
            </div>
          )}
          <Button
            disabled={busy || (method === "cash" && (Number.isNaN(tenderedNum) || change < 0))}
            onClick={() =>
              pay.mutate({
                payment_method: method,
                amount_tendered: method === "cash" ? tenderedNum : null,
                payment_reference: method === "cash" ? "" : reference,
              })
            }
            className="h-12 w-full rounded-full bg-bean text-base font-bold hover:bg-bean-dark"
            data-testid="cashier-confirm-payment-button"
          >
            {pay.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            Confirm payment {money(order.total)}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {canServe && (
          <Button
            disabled={busy}
            onClick={() => serve.mutate()}
            className="col-span-2 h-11 rounded-full bg-espresso font-bold text-white hover:bg-roast"
            data-testid="cashier-mark-served-button"
          >
            {serve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ConciergeBell className="h-4 w-4" />} Mark as served
          </Button>
        )}
        <Button variant="outline" className="rounded-full" onClick={() => onPrint(order)} data-testid="cashier-billing-button">
          <FileText className="h-4 w-4" /> {order.status === "paid" ? "Receipt" : "Billing statement"}
        </Button>
        {order.status === "unpaid" ? (
          <Button
            variant="outline"
            className="rounded-full text-destructive hover:text-destructive"
            disabled={busy}
            onClick={() => window.confirm(`Cancel order ${orderNo(order.order_number)}?`) && cancel.mutate()}
            data-testid="cashier-cancel-order-button"
          >
            <Ban className="h-4 w-4" /> Cancel order
          </Button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
}

function Terminal({ username }: { username: string }) {
  const { settings } = useSettings();
  const isDesktop = useIsDesktop();
  const [filter, setFilter] = useState<Filter>("new");
  const [table, setTable] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  const tablesQ = useQuery({ queryKey: ["staff-tables"], queryFn: () => apiGet<DiningTable[]>("/staff/tables") });
  const activeQ = useQuery({
    queryKey: ["staff-orders", "new"],
    queryFn: () => apiGet<Order[]>("/staff/orders?fulfillment=new"),
    refetchInterval: 4000,
  });
  const f = FILTERS.find((x) => x.id === filter)!;
  const listQ = useQuery({
    queryKey: ["staff-orders", filter],
    queryFn: () => apiGet<Order[]>(`/staff/orders${f.query ? `?${f.query}` : ""}`),
    refetchInterval: 4000,
  });
  const newOrders = activeQ.isError ? [] : activeQ.data ?? [];
  const list = (listQ.isError ? [] : listQ.data ?? []).filter((o) => table === null || o.table_number === table);
  const selected = [...(listQ.data ?? []), ...newOrders].find((o) => o.id === selectedId) ?? null;

  const openByTable = useMemo(() => {
    const m: Record<number, number> = {};
    for (const o of newOrders) m[o.table_number] = (m[o.table_number] ?? 0) + 1;
    return m;
  }, [newOrders]);

  // Announce newly arrived orders.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!activeQ.data) return;
    if (seen.current) {
      for (const o of activeQ.data) {
        if (!seen.current.has(o.id)) toast.info(`New order ${orderNo(o.order_number)} from Table #${o.table_number}`);
      }
    }
    seen.current = new Set(activeQ.data.map((o) => o.id));
  }, [activeQ.data]);

  const tables = tablesQ.data ?? [];

  return (
    <div className="min-h-dvh bg-cream">
      <header className="sticky top-0 z-30 bg-roast text-white shadow-lg no-print">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-12" />
          <div className="min-w-0 flex-1">
            <p className="font-heading text-xl font-semibold leading-tight">Cashier Terminal</p>
            <p className="truncate text-xs text-[#D6BEA8]">{settings.shop_name}</p>
          </div>
          <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs sm:flex" data-testid="cashier-new-count">
            <span className={cn("h-2 w-2 rounded-full", newOrders.length ? "bg-amber-400 animate-pulse" : "bg-emerald-400")} />
            {newOrders.length} open order{newOrders.length === 1 ? "" : "s"}
          </div>
          <span className="hidden text-sm text-[#D6BEA8] md:inline" data-testid="cashier-username">{username}</span>
          <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => endSession("/cashier")} data-testid="cashier-logout-button">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="min-w-0 space-y-5">
          <div className="rounded-3xl border bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Tables <span className="font-medium normal-case tracking-normal">- highlighted tables have open orders</span>
              </p>
              {table !== null && (
                <button className="shrink-0 text-xs font-semibold text-bean hover:underline" onClick={() => setTable(null)} data-testid="cashier-clear-table-filter">
                  Show all tables
                </button>
              )}
            </div>
            {tablesQ.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading tables...</p>
            ) : (
              <div className="grid max-h-44 grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5 overflow-y-auto pr-1" data-testid="cashier-table-grid">
                {tables.map((t) => {
                  const c = openByTable[t.number] ?? 0;
                  return (
                    <button
                      key={t.id}
                      title={t.label || `Table ${t.number}`}
                      onClick={() => setTable(table === t.number ? null : t.number)}
                      className={cn(
                        "relative h-11 rounded-xl text-xs font-bold transition-[background-color,color,transform] active:scale-95",
                        table === t.number ? "bg-espresso text-white" : c > 0 ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300" : "bg-latte text-muted-foreground hover:bg-secondary",
                      )}
                      data-testid={`cashier-table-${t.number}`}
                    >
                      {t.number}
                      {c > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-bean px-1 text-[9px] text-white">{c}</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((x) => (
              <button
                key={x.id}
                onClick={() => setFilter(x.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color,border-color]",
                  filter === x.id ? "bg-bean text-white shadow" : "border bg-white text-espresso hover:border-bean",
                )}
                data-testid={`cashier-filter-${x.id}`}
              >
                {x.label}
                {x.id === "new" && newOrders.length > 0 && <span className="ml-1.5 rounded-full bg-white/25 px-1.5 text-xs">{newOrders.length}</span>}
              </button>
            ))}
            <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={cn("h-3.5 w-3.5", listQ.isFetching && "animate-spin")} /> Live
            </span>
          </div>

          {listQ.isError && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-red-50 p-4 text-sm text-destructive" data-testid="cashier-error">
              <AlertTriangle className="h-4 w-4" /> {errorText(listQ.error, "Could not load orders")}. Retrying automatically.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3" data-testid="cashier-order-list">
            {listQ.isLoading &&
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-white" />)}
            {!listQ.isLoading && !listQ.isError && list.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed bg-white/60 p-10 text-center text-muted-foreground" data-testid="cashier-empty">
                <p className="font-heading text-lg text-espresso">No orders here</p>
                <p className="mt-1 text-sm">New table orders appear automatically.</p>
              </div>
            )}
            {list.map((o) => {
              const Icon = METHOD_ICON[o.payment_method];
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedId(o.id)}
                  className={cn(
                    "min-w-0 rounded-3xl border bg-white p-4 text-left transition-[box-shadow,border-color,transform] hover:-translate-y-0.5 hover:shadow-lg",
                    selectedId === o.id && "border-bean ring-2 ring-bean/30",
                    o.fulfillment === "new" && o.status !== "cancelled" && "border-l-4 border-l-bean",
                  )}
                  data-testid={`cashier-order-card-${o.order_number}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        {orderNo(o.order_number)} - {fmtTime(o.created_at)}
                      </p>
                      <p className="font-heading text-2xl font-semibold">Table #{o.table_number}</p>
                      <p className="truncate text-sm text-muted-foreground">{o.nickname}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <FulfillmentBadge value={o.fulfillment} />
                      <StatusBadge status={o.status} />
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-xs text-espresso/80">{o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}</p>
                  {o.notes && (
                    <p className="mt-1 flex items-center gap-1 truncate text-xs font-semibold text-amber-800">
                      <MessageSquareText className="h-3.5 w-3.5 shrink-0" /> {o.notes}
                    </p>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-3">
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground">
                      <Icon className="h-4 w-4 shrink-0" /> {METHOD_LABEL[o.payment_method]} - {o.item_count} item{o.item_count === 1 ? "" : "s"}
                    </span>
                    <span className="shrink-0 font-bold text-bean">{money(o.total)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {isDesktop && (
          <aside className="sticky top-24 h-fit max-h-[calc(100dvh-7rem)] overflow-y-auto rounded-3xl border bg-white/70 p-5 backdrop-blur">
            {selected ? (
              <OrderDetail key={`${selected.id}-${selected.status}-${selected.fulfillment}`} order={selected} onPrint={setReceipt} />
            ) : (
              <div className="py-16 text-center text-muted-foreground" data-testid="cashier-detail-empty">
                <p className="font-heading text-xl text-espresso">Select an order</p>
                <p className="mt-1 text-sm">View items, confirm payment, mark as served and print the billing statement.</p>
              </div>
            )}
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
          <SheetContent side="bottom" showCloseButton={false} className="max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-cream p-5">
            <SheetHeader className="sr-only">
              <SheetTitle>Order detail</SheetTitle>
            </SheetHeader>
            {selected && (
              <OrderDetail key={`${selected.id}-${selected.status}-${selected.fulfillment}`} order={selected} onPrint={setReceipt} onClose={() => setSelectedId(null)} />
            )}
          </SheetContent>
        </Sheet>
      )}

      <ReceiptDialog order={receipt} settings={settings} onClose={() => setReceipt(null)} />
    </div>
  );
}

export default function CashierTerminal() {
  const me = useMe();
  if (me.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream">
        <Loader2 className="h-6 w-6 animate-spin text-bean" />
      </div>
    );
  }
  if (!me.data) return <StaffLogin portal="cashier" title="Cashier sign in" subtitle="Receive table orders, confirm payments and serve." />;
  return <Terminal username={me.data.username} />;
}
