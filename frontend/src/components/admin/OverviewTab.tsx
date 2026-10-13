import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Banknote, ClipboardList, ConciergeBell, Hourglass, QrCode, Coffee, Wallet } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { apiGet } from "@/lib/api";
import { money } from "@/lib/format";
import { errorText } from "@/lib/queries";
import type { Stats } from "@/lib/types";

const METHOD_NAME: Record<string, string> = { cash: "Cash", gcash: "GCash", card: "Card / ATM" };

export default function OverviewTab() {
  const q = useQuery({ queryKey: ["admin-stats"], queryFn: () => apiGet<Stats>("/admin/stats"), refetchInterval: 10000 });
  const s = q.isError ? undefined : q.data;
  const v = (x: string | undefined) => (q.isLoading ? "..." : x ?? "-");
  const small = [
    { label: "Orders today", value: v(s && String(s.today_orders)), icon: ClipboardList, id: "today-orders" },
    { label: "Unpaid orders", value: v(s && String(s.unpaid_orders)), icon: Hourglass, id: "unpaid-orders" },
    { label: "Not yet served", value: v(s && String(s.unserved_orders)), icon: ConciergeBell, id: "unserved-orders" },
    { label: "Active tables", value: v(s && String(s.table_count)), icon: QrCode, id: "table-count" },
    { label: "Products", value: v(s && String(s.product_count)), icon: Coffee, id: "product-count" },
  ];
  const maxQty = Math.max(1, ...(s?.top_items.map((t) => t.qty) ?? [1]));

  return (
    <div className="animate-rise">
      <PageHeader title="Overview" desc={`Business summary${s ? ` for ${s.today}` : ""}. Sales count only orders the cashier has confirmed as paid.`} />
      {q.isError && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" /> {errorText(q.error, "Could not load statistics")}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div className="flex flex-col justify-between rounded-3xl bg-bean p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-[#F3E7D9]">Sales today</p>
            <Banknote className="h-5 w-5 text-foam" />
          </div>
          <p className="mt-4 break-words font-heading text-4xl font-bold" data-testid="stat-today-sales">{v(s && money(s.today_sales))}</p>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#F3E7D9]">
            <Wallet className="h-4 w-4" /> All-time <span className="font-bold text-white" data-testid="stat-total-sales">{v(s && money(s.total_sales))}</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {small.map((c) => (
            <div key={c.id} className="min-w-0 rounded-3xl border bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase leading-snug tracking-widest text-muted-foreground">{c.label}</p>
                <c.icon className="h-5 w-5 shrink-0 text-bean" />
              </div>
              <p className="mt-3 font-heading text-3xl font-bold" data-testid={`stat-${c.id}`}>{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border bg-white p-6">
          <h3 className="text-xl font-semibold">Top selling items</h3>
          <p className="text-sm text-muted-foreground">From paid orders.</p>
          <div className="mt-5 space-y-4" data-testid="stat-top-items">
            {(s?.top_items ?? []).length === 0 && <p className="text-sm text-muted-foreground">No paid orders yet.</p>}
            {s?.top_items.map((t) => (
              <div key={t.name}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{t.name}</span>
                  <span className="shrink-0 text-muted-foreground">{t.qty} sold - {money(t.sales)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-latte">
                  <div className="h-2 rounded-full bg-bean transition-[width] duration-700" style={{ width: `${(t.qty / maxQty) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl border bg-white p-6">
          <h3 className="text-xl font-semibold">Payment methods</h3>
          <p className="text-sm text-muted-foreground">{s?.total_orders ?? 0} paid orders in total.</p>
          <div className="mt-5 space-y-2" data-testid="stat-by-method">
            {(s?.by_method ?? []).length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
            {s?.by_method.map((m) => (
              <div key={m.method} className="flex items-center justify-between gap-3 rounded-2xl bg-cream px-4 py-3">
                <span className="text-sm font-bold">{METHOD_NAME[m.method] ?? m.method}</span>
                <span className="text-right text-sm">{m.count} orders - <span className="font-bold text-bean">{money(m.sales)}</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
