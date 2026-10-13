import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CloudUpload, DatabaseBackup, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/admin/PageHeader";
import { EMPTY_FILTERS, ExportButton, FilterBar, type OrderFilters } from "@/components/admin/OrderFilters";
import { apiDownload, apiPost } from "@/lib/api";
import { errorText } from "@/lib/queries";
import type { RestoreOut } from "@/lib/types";

export default function BackupTab() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState<OrderFilters>(EMPTY_FILTERS);
  const [backingUp, setBackingUp] = useState(false);
  const restore = useMutation({
    mutationFn: (body: unknown) => apiPost<RestoreOut>("/admin/restore", body),
    onSuccess: (r) => {
      qc.invalidateQueries();
      toast.success(`Restored ${r.products} products, ${r.tables} tables, ${r.orders} orders and ${r.images} images`);
    },
    onError: (e) => toast.error(errorText(e, "Restore failed")),
  });

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (typeof data !== "object" || !Array.isArray(data.products)) throw new Error("bad");
      if (window.confirm("Restoring replaces the current products, tables and orders with the ones in this file. Continue?")) restore.mutate(data);
    } catch {
      toast.error("That file is not a valid backup (.json)");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function downloadBackup() {
    setBackingUp(true);
    try {
      const r = await apiDownload("/admin/backup");
      toast.success(`Backup saved as ${r.filename}`);
    } catch (e) {
      toast.error(errorText(e, "Backup failed"));
    } finally {
      setBackingUp(false);
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader title="Backup and Export" desc="Download order summaries for reports, and keep a full copy of your data in your cloud storage." />

      <section className="rounded-3xl border bg-white p-5 sm:p-6" data-testid="export-section">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-secondary text-bean"><FileSpreadsheet className="h-5 w-5" /></span>
            <div>
              <h3 className="text-lg font-semibold">Order summary (Excel)</h3>
              <p className="text-sm text-muted-foreground">
                Worksheets: Order Summary, Order Items (one row per product), Daily Sales and Products. Leave dates empty to export all orders.
              </p>
            </div>
          </div>
          <ExportButton filters={filters} label="Download Excel" testId="backup-export-excel-button" />
        </div>
        <div className="mt-5 border-t pt-5">
          <FilterBar value={filters} onChange={setFilters} />
        </div>
      </section>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <section className="flex flex-col rounded-3xl border bg-white p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-bean"><DatabaseBackup className="h-5 w-5" /></span>
          <h3 className="mt-3 text-lg font-semibold">Full backup</h3>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">
            Settings, products, tables, orders and uploaded images in one .json file. Upload it to Google Drive, OneDrive or Dropbox as your cloud backup.
          </p>
          <Button onClick={downloadBackup} disabled={backingUp} className="mt-5 w-fit rounded-full bg-bean hover:bg-bean-dark" data-testid="backup-download-button">
            {backingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />} Download backup
          </Button>
        </section>
        <section className="flex flex-col rounded-3xl border bg-white p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-bean"><Upload className="h-5 w-5" /></span>
          <h3 className="mt-3 text-lg font-semibold">Restore</h3>
          <p className="mt-1 flex-1 text-sm text-muted-foreground">Upload a backup .json file to bring back its data. Staff usernames and passwords are not changed.</p>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} data-testid="backup-restore-file-input" />
          <Button variant="outline" disabled={restore.isPending} onClick={() => fileRef.current?.click()} className="mt-5 w-fit rounded-full border-bean text-bean" data-testid="backup-restore-button">
            {restore.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Restore from file
          </Button>
        </section>
      </div>
    </div>
  );
}
