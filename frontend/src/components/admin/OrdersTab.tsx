import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FulfillmentBadge, ReceiptDialog, StatusBadge } from "@/components/ReceiptView";
import PageHeader from "@/components/admin/PageHeader";
import { EMPTY_FILTERS, ExportButton, FilterBar, filterError, filtersToQuery, type OrderFilters } from "@/components/admin/OrderFilters";
import { apiGet } from "@/lib/api";
import { METHOD_LABEL, fmtDateTime, money, orderNo } from "@/lib/format";
import { errorText, useSettings } from "@/lib/queries";
import type { Order } from "@/lib/types";

const PAGE = 15;

export default function OrdersTab() {
  const { settings } = useSettings();
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [receipt, setReceipt] = useState<Order | null>(null);
  const invalid = filterError(filters) !== null;
  const qs = filtersToQuery(filters);
  const q = useQuery({
    queryKey: ["staff-orders", "admin", qs],
    queryFn: () => apiGet<Order[]>(`/staff/orders${qs}${qs ? "&" : "?"}limit=2000`),
    enabled: !invalid,
    refetchInterval: 10000,
  });
  const orders = q.isError ? [] : q.data ?? [];
  const pages = Math.max(1, Math.ceil(orders.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const rows = orders.slice(cur * PAGE, cur * PAGE + PAGE);
  const paidTotal = orders.filter((o) => o.status === "paid").reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-rise">
      <PageHeader
        title="Orders"
        desc="Every order placed from the table QR menus. Payments and serving are handled at the cashier terminal."
        actions={<ExportButton filters={filters} label="Export filtered to Excel" testId="orders-export-button" />}
      />

      <div className="rounded-3xl border bg-white p-4 sm:p-5">
        <FilterBar value={filters} onChange={(f) => { setFilters(f); setPage(0); }} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 px-1 text-sm text-muted-foreground" data-testid="orders-summary">
        <span><span className="font-bold text-espresso">{orders.length}</span> orders</span>
        <span>Paid total <span className="font-bold text-bean">{money(paidTotal)}</span></span>
        {q.isFetching && <Loader2 className="h-4 w-4 animate-spin" />}
      </div>

      <div className="mt-3 overflow-hidden rounded-3xl border bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm" data-testid="admin-orders-table">
            <thead className="bg-latte text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-bold">Order</th>
                <th className="px-3 py-3 font-bold">Date and time</th>
                <th className="px-3 py-3 font-bold">Table</th>
                <th className="px-3 py-3 font-bold">Customer</th>
                <th className="px-3 py-3 font-bold">Items</th>
                <th className="px-3 py-3 text-right font-bold">Total</th>
                <th className="px-3 py-3 font-bold">Method</th>
                <th className="px-3 py-3 font-bold">Payment</th>
                <th className="px-3 py-3 font-bold">Order</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {q.isLoading && (
                <tr><td colSpan={10} className="py-12 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              )}
              {q.isError && (
                <tr><td colSpan={10} className="py-10 text-center text-destructive"><AlertTriangle className="mr-1 inline h-4 w-4" />{errorText(q.error, "Could not load orders")}</td></tr>
              )}
              {!q.isLoading && !q.isError && rows.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center text-muted-foreground" data-testid="orders-empty">No orders match these filters.</td></tr>
              )}
              {rows.map((o) => (
                <tr key={o.id} className="align-top transition-colors hover:bg-cream/60" data-testid={`admin-order-row-${o.order_number}`}>
                  <td className="px-4 py-3 font-mono font-semibold">{orderNo(o.order_number)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">{fmtDateTime(o.created_at)}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold">#{o.table_number}</td>
                  <td className="max-w-[140px] truncate px-3 py-3" title={o.nickname}>{o.nickname}</td>
                  <td className="max-w-[240px] px-3 py-3 text-xs">
                    <p className="line-clamp-2" title={o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}>
                      {o.items.map((i) => `${i.qty}x ${i.name}`).join(", ")}
                    </p>
                    {o.notes && <p className="mt-0.5 truncate text-amber-800" title={o.notes}>Note: {o.notes}</p>}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-bean">{money(o.total)}</td>
                  <td className="whitespace-nowrap px-3 py-3">{METHOD_LABEL[o.payment_method]}</td>
                  <td className="px-3 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-3 py-3"><FulfillmentBadge value={o.fulfillment} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setReceipt(o)} data-testid={`admin-order-receipt-${o.order_number}`}>
                      <FileText className="h-4 w-4" /> View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <span className="text-muted-foreground" data-testid="orders-page-info">
            Page {cur + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="rounded-full" disabled={cur === 0} onClick={() => setPage(cur - 1)} data-testid="orders-prev-page">
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button size="sm" variant="outline" className="rounded-full" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} data-testid="orders-next-page">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <ReceiptDialog order={receipt} settings={settings} onClose={() => setReceipt(null)} />
    </div>
  );
}
