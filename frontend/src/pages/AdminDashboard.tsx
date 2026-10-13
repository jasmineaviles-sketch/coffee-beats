import { Loader2, LogOut, ExternalLink, LayoutDashboard, Coffee, ClipboardList, QrCode, Settings2, DatabaseBackup } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandMark from "@/components/BrandMark";
import StaffLogin from "@/components/StaffLogin";
import OverviewTab from "@/components/admin/OverviewTab";
import ProductsTab from "@/components/admin/ProductsTab";
import OrdersTab from "@/components/admin/OrdersTab";
import TablesTab from "@/components/admin/TablesTab";
import SettingsTab from "@/components/admin/SettingsTab";
import BackupTab from "@/components/admin/BackupTab";
import { useMe, useSettings } from "@/lib/queries";
import { endSession } from "@/lib/session";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, el: OverviewTab },
  { id: "products", label: "Products", icon: Coffee, el: ProductsTab },
  { id: "orders", label: "Orders", icon: ClipboardList, el: OrdersTab },
  { id: "tables", label: "Table QR", icon: QrCode, el: TablesTab },
  { id: "settings", label: "Settings", icon: Settings2, el: SettingsTab },
  { id: "backup", label: "Backup and Export", icon: DatabaseBackup, el: BackupTab },
] as const;

export default function AdminDashboard() {
  const me = useMe();
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const active = SECTIONS.find((s) => s.id === params.get("tab")) ?? SECTIONS[0];
  const go = (id: string) => setParams({ tab: id }, { replace: true });

  if (me.isLoading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-cream">
        <Loader2 className="h-6 w-6 animate-spin text-bean" />
      </div>
    );
  }
  if (!me.data || me.data.role !== "admin") {
    return <StaffLogin portal="admin" title="Admin sign in" subtitle="Manage products, tables, payments and store settings." />;
  }

  const Active = active.el;
  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="no-print hidden border-r bg-roast text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex items-center gap-3 px-5 py-5">
          <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-14" />
          <div className="min-w-0">
            <p className="font-heading text-base font-semibold leading-tight break-words">{settings.shop_name}</p>
            <p className="text-xs text-[#D6BEA8]">Admin Dashboard</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3" data-testid="admin-sidebar">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => go(s.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition-[background-color,color]",
                active.id === s.id ? "bg-bean text-white shadow-lg" : "text-[#E5D2BF] hover:bg-white/10 hover:text-white",
              )}
              data-testid={`admin-tab-${s.id}`}
            >
              <s.icon className="h-4 w-4 shrink-0" /> {s.label}
            </button>
          ))}
        </nav>
        <div className="space-y-2 border-t border-white/10 p-4">
          <Link to="/cashier" className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-[#E5D2BF] transition-colors hover:bg-white/10" data-testid="admin-open-cashier-link">
            Cashier terminal <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="truncate text-sm text-[#D6BEA8]" data-testid="admin-username">Signed in as {me.data.username}</span>
            <Button variant="ghost" size="icon-sm" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => endSession("/admin")} aria-label="Sign out" data-testid="admin-logout-button">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 bg-roast text-white shadow-lg lg:hidden">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-11" />
            <p className="min-w-0 flex-1 truncate font-heading text-lg font-semibold">Admin Dashboard</p>
            <Button variant="ghost" size="sm" className="rounded-full text-white hover:bg-white/10 hover:text-white" onClick={() => endSession("/admin")} data-testid="admin-logout-button-mobile">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2.5">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-[background-color,color]",
                  active.id === s.id ? "bg-bean text-white" : "bg-white/10 text-[#E5D2BF]",
                )}
                data-testid={`admin-tab-mobile-${s.id}`}
              >
                <s.icon className="h-3.5 w-3.5" /> {s.label}
              </button>
            ))}
          </nav>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8" data-testid={`admin-section-${active.id}`}>
          <Active />
        </main>
      </div>
    </div>
  );
}
