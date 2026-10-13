import { useState } from "react";
import { FileSpreadsheet, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiDownload } from "@/lib/api";
import { errorText } from "@/lib/queries";

export interface OrderFilters {
  start: string;
  end: string;
  status: string; // payment status
  fulfillment: string;
  method: string;
}

export const EMPTY_FILTERS: OrderFilters = { start: "", end: "", status: "all", fulfillment: "all", method: "all" };

export function filtersToQuery(f: OrderFilters): string {
  const p = new URLSearchParams();
  if (f.start) p.set("start", f.start);
  if (f.end) p.set("end", f.end);
  if (f.status !== "all") p.set("status", f.status);
  if (f.fulfillment !== "all") p.set("fulfillment", f.fulfillment);
  if (f.method !== "all") p.set("method", f.method);
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function filterError(f: OrderFilters): string | null {
  if (f.start && f.end && f.start > f.end) return "Start date must be on or before end date";
  return null;
}

const OPTIONS = {
  status: { all: "All payments", unpaid: "Unpaid", paid: "Paid", cancelled: "Cancelled" },
  fulfillment: { all: "All order status", new: "New", served: "Served" },
  method: { all: "All methods", cash: "Cash", gcash: "GCash", card: "Card / ATM" },
} as const;

function FilterSelect({ k, value, onChange }: { k: keyof typeof OPTIONS; value: string; onChange: (v: string) => void }) {
  const opts = OPTIONS[k] as Record<string, string>;
  return (
    <Select value={value} onValueChange={(v: string) => onChange(v || "all")}>
      <SelectTrigger className="h-10 w-full rounded-xl bg-white" data-testid={`filter-${k}-select`}>
        <SelectValue>{(v) => opts[v as string] ?? opts.all}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(opts).map(([v, label]) => (
          <SelectItem key={v} value={v} data-testid={`filter-${k}-option-${v}`}>{label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterBar({ value, onChange }: { value: OrderFilters; onChange: (f: OrderFilters) => void }) {
  const set = (k: keyof OrderFilters) => (v: string) => onChange({ ...value, [k]: v });
  const err = filterError(value);
  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={value.start} onChange={(e) => set("start")(e.target.value)} className="h-10 rounded-xl bg-white" data-testid="filter-start-date" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={value.end} onChange={(e) => set("end")(e.target.value)} className="h-10 rounded-xl bg-white" data-testid="filter-end-date" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Payment status</Label>
          <FilterSelect k="status" value={value.status} onChange={set("status")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Order status</Label>
          <FilterSelect k="fulfillment" value={value.fulfillment} onChange={set("fulfillment")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Payment method</Label>
          <FilterSelect k="method" value={value.method} onChange={set("method")} />
        </div>
        <Button variant="ghost" className="h-10 rounded-full" onClick={() => onChange(EMPTY_FILTERS)} data-testid="filter-reset-button">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
      {err && <p className="text-sm font-medium text-destructive" data-testid="filter-error">{err}</p>}
    </div>
  );
}

export function ExportButton({ filters, label = "Export to Excel", testId = "export-excel-button" }: { filters: OrderFilters; label?: string; testId?: string }) {
  const [busy, setBusy] = useState(false);
  async function run() {
    const err = filterError(filters);
    if (err) return toast.error(err);
    setBusy(true);
    try {
      const r = await apiDownload(`/admin/export.xlsx${filtersToQuery(filters)}`);
      toast.success(`Exported ${r.count ?? 0} order${r.count === 1 ? "" : "s"} to ${r.filename}`);
    } catch (e) {
      toast.error(errorText(e, "Export failed"));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button onClick={run} disabled={busy} className="rounded-full bg-bean hover:bg-bean-dark" data-testid={testId}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />} {label}
    </Button>
  );
}
