import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { ExternalLink, Layers, Loader2, Pencil, Plus, Power, Printer, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/admin/PageHeader";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { errorText, useSettings } from "@/lib/queries";
import type { BulkOut, DiningTable, TableBulkIn, TableIn, TableUpdate } from "@/lib/types";
import { cn } from "@/lib/utils";

type View = "all" | "active" | "inactive";

function EditDialog({ table, onClose }: { table: DiningTable | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [label, setLabel] = useState(table?.label ?? "");
  const [active, setActive] = useState(table?.active ?? true);
  const save = useMutation({
    mutationFn: (b: TableUpdate) => apiPut<DiningTable>(`/admin/tables/${table!.number}`, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tables"] });
      qc.invalidateQueries({ queryKey: ["staff-tables"] });
      toast.success(`Table ${table!.number} updated`);
      onClose();
    },
    onError: (e) => toast.error(errorText(e)),
  });
  return (
    <Dialog open={!!table} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-sm" data-testid="table-edit-dialog">
        <DialogHeader>
          <DialogTitle>Edit table #{table?.number}</DialogTitle>
          <DialogDescription>The table number is fixed so its printed QR code keeps working.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label (optional)</Label>
            <Input value={label} maxLength={40} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Garden 1" className="rounded-xl" data-testid="table-edit-label-input" />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(Boolean(v))} data-testid="table-edit-active-checkbox" />
            Active (accepts orders)
          </label>
        </div>
        <DialogFooter>
          <Button disabled={save.isPending} onClick={() => save.mutate({ label, active })} className="rounded-full bg-bean hover:bg-bean-dark" data-testid="table-edit-save-button">
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TablesTab() {
  const qc = useQueryClient();
  const { settings } = useSettings();
  const q = useQuery({ queryKey: ["admin-tables"], queryFn: () => apiGet<DiningTable[]>("/admin/tables") });
  const tables = useMemo(() => (q.isError ? [] : q.data ?? []), [q.data, q.isError]);
  const nextNumber = tables.reduce((m, t) => Math.max(m, t.number), 0) + 1;

  const [base, setBase] = useState(window.location.origin);
  const [view, setView] = useState<View>("all");
  const [search, setSearch] = useState("");
  const [single, setSingle] = useState({ number: "", label: "" });
  const [bulk, setBulk] = useState({ start: "", end: "" });
  const [editing, setEditing] = useState<DiningTable | null>(null);
  const url = (n: number) => `${base.replace(/\/+$/, "")}/t/${n}`;

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-tables"] });
    qc.invalidateQueries({ queryKey: ["staff-tables"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const add = useMutation({
    mutationFn: (b: TableIn) => apiPost<DiningTable>("/admin/tables", b),
    onSuccess: (t) => {
      refresh();
      setSingle({ number: "", label: "" });
      toast.success(`Table ${t.number} added`);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const addBulk = useMutation({
    mutationFn: (b: TableBulkIn) => apiPost<BulkOut>("/admin/tables/bulk", b),
    onSuccess: (r) => {
      refresh();
      setBulk({ start: "", end: "" });
      toast.success(`${r.created} table${r.created === 1 ? "" : "s"} added${r.skipped ? `, ${r.skipped} already existed` : ""}`);
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const toggle = useMutation({
    mutationFn: (t: DiningTable) => apiPut<DiningTable>(`/admin/tables/${t.number}`, { label: t.label, active: !t.active }),
    onSuccess: (t) => {
      refresh();
      toast.success(`Table ${t.number} ${t.active ? "activated" : "deactivated"}`);
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const shown = tables.filter(
    (t) =>
      (view === "all" || (view === "active" ? t.active : !t.active)) &&
      (!search || String(t.number).includes(search) || t.label.toLowerCase().includes(search.toLowerCase())),
  );
  const activeCount = tables.filter((t) => t.active).length;

  function submitSingle(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(single.number || String(nextNumber), 10);
    if (!(n >= 1 && n <= 9999)) return toast.error("Table number must be between 1 and 9999");
    if (tables.some((t) => t.number === n)) return toast.error(`Table ${n} already exists`);
    add.mutate({ number: n, label: single.label.trim() });
  }
  function submitBulk(e: React.FormEvent) {
    e.preventDefault();
    const s = parseInt(bulk.start || String(nextNumber), 10);
    const en = parseInt(bulk.end, 10);
    if (!(s >= 1) || !(en >= 1)) return toast.error("Enter a start and end number");
    if (en < s) return toast.error("End number must be greater than or equal to start number");
    if (en - s + 1 > 500) return toast.error("You can add up to 500 tables at a time");
    addBulk.mutate({ start: s, end: en });
  }

  return (
    <div className="animate-rise">
      <div className="no-print">
        <PageHeader
          title="Table QR"
          desc="Each table has its own QR code that opens the menu with the table number filled in. Deactivated tables cannot place orders."
          actions={
            <Button onClick={() => window.print()} disabled={activeCount === 0} className="rounded-full bg-bean hover:bg-bean-dark" data-testid="qr-print-all-button">
              <Printer className="h-4 w-4" /> Print {activeCount} active QR codes
            </Button>
          }
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tables</p>
            <p className="mt-2 font-heading text-4xl font-bold" data-testid="tables-total">{tables.length}</p>
            <p className="text-sm text-muted-foreground"><span data-testid="tables-active-count">{activeCount}</span> active, {tables.length - activeCount} inactive</p>
          </div>
          <form onSubmit={submitSingle} className="rounded-3xl border bg-white p-5" data-testid="table-add-form">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add one table</p>
            <div className="mt-3 grid grid-cols-[90px_1fr] gap-2">
              <Input type="number" min={1} placeholder={String(nextNumber)} value={single.number} onChange={(e) => setSingle({ ...single, number: e.target.value })} className="rounded-xl" data-testid="table-add-number-input" />
              <Input placeholder="Label (optional)" maxLength={40} value={single.label} onChange={(e) => setSingle({ ...single, label: e.target.value })} className="rounded-xl" data-testid="table-add-label-input" />
            </div>
            <Button type="submit" disabled={add.isPending} variant="outline" className="mt-3 w-full rounded-full border-bean text-bean" data-testid="table-add-button">
              {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add table
            </Button>
          </form>
          <form onSubmit={submitBulk} className="rounded-3xl border bg-white p-5" data-testid="table-bulk-form">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Add a range</p>
            <div className="mt-3 flex items-center gap-2">
              <Input type="number" min={1} placeholder={String(nextNumber)} value={bulk.start} onChange={(e) => setBulk({ ...bulk, start: e.target.value })} className="rounded-xl" data-testid="table-bulk-start-input" />
              <span className="text-sm text-muted-foreground">to</span>
              <Input type="number" min={1} placeholder={String(nextNumber + 19)} value={bulk.end} onChange={(e) => setBulk({ ...bulk, end: e.target.value })} className="rounded-xl" data-testid="table-bulk-end-input" />
            </div>
            <Button type="submit" disabled={addBulk.isPending} variant="outline" className="mt-3 w-full rounded-full border-bean text-bean" data-testid="table-bulk-add-button">
              {addBulk.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />} Add tables
            </Button>
          </form>
        </div>

        <div className="mt-5 grid gap-3 rounded-3xl border bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Website address used inside the QR codes</Label>
            <Input value={base} onChange={(e) => setBase(e.target.value)} className="rounded-xl" data-testid="qr-base-url-input" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Find table" value={search} onChange={(e) => setSearch(e.target.value)} className="w-40 rounded-full pl-9" data-testid="table-search-input" />
            </div>
            {(["all", "active", "inactive"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn("rounded-full px-3 py-2 text-sm font-semibold capitalize transition-colors", view === v ? "bg-espresso text-white" : "border hover:border-bean")}
                data-testid={`table-view-${v}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {q.isLoading && <p className="mt-6 text-sm text-muted-foreground">Loading tables...</p>}
      {q.isError && <p className="mt-6 text-sm text-destructive">{errorText(q.error, "Could not load tables")}</p>}
      {!q.isLoading && shown.length === 0 && !q.isError && (
        <p className="mt-6 rounded-3xl border border-dashed bg-white/60 p-10 text-center text-muted-foreground" data-testid="tables-empty">No tables match.</p>
      )}

      <div className="no-print mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" data-testid="qr-grid">
        {shown.map((t) => (
          <div key={t.id} className={cn("flex flex-col items-center rounded-3xl border-2 bg-white p-4 text-center transition-opacity", t.active ? "border-[#DFCABB]" : "border-dashed opacity-60")} data-testid={`qr-card-${t.number}`}>
            <QRCodeSVG value={url(t.number)} size={112} fgColor="#26150D" level="M" />
            <span className="mt-2 rounded-full bg-bean px-3 py-0.5 text-sm font-bold text-white">TABLE #{t.number}</span>
            <p className="mt-1 h-4 w-full truncate text-xs text-muted-foreground" title={t.label}>{t.label || (t.active ? "Active" : "Inactive")}</p>
            <div className="mt-2 flex w-full justify-center gap-1">
              <Button size="icon-sm" variant="ghost" className="rounded-full" onClick={() => setEditing(t)} aria-label="Edit" data-testid={`table-edit-${t.number}`}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="ghost" className={cn("rounded-full", t.active ? "text-destructive hover:text-destructive" : "text-emerald-700")} onClick={() => toggle.mutate(t)} aria-label={t.active ? "Deactivate" : "Activate"} data-testid={`table-toggle-${t.number}`}>
                <Power className="h-4 w-4" />
              </Button>
              <a href={url(t.number)} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-full text-bean transition-colors hover:bg-muted" aria-label="Open menu" data-testid={`qr-open-${t.number}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Print layout: active tables only */}
      <div className="print-area hidden print:block">
        <div className="qr-sheet">
          {tables.filter((t) => t.active).map((t) => (
            <div key={t.id} className="qr-card flex flex-col items-center rounded-2xl border-2 border-[#DFCABB] p-3 text-center">
              <img src={settings.logo_url || "/brand/logo.png"} alt="" className="h-12 w-12 object-contain" />
              <QRCodeSVG value={url(t.number)} size={130} fgColor="#26150D" level="M" />
              <p className="mt-1 text-base font-bold">TABLE #{t.number}</p>
              {t.label && <p className="text-xs">{t.label}</p>}
              <p className="text-[10px]">Scan to view menu and order</p>
            </div>
          ))}
        </div>
      </div>

      <EditDialog key={editing?.id ?? "none"} table={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
