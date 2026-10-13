import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import BrandMark from "@/components/BrandMark";
import { useSettings } from "@/lib/queries";

export default function Home() {
  const { settings } = useSettings();
  const nav = useNavigate();
  const [table, setTable] = useState("");

  return (
    <div className="relative min-h-dvh overflow-hidden bg-roast text-white">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${settings.background_url})` }} />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(24,14,9,0.94)_0%,rgba(43,24,16,0.75)_55%,rgba(24,14,9,0.55)_100%)]" />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-6xl flex-col px-6 py-8 sm:px-10">
        <header className="flex items-center justify-end gap-2">
          <Link to="/cashier" className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/20" data-testid="nav-cashier-link">
            Cashier
          </Link>
          <Link to="/admin" className="rounded-full bg-bean px-4 py-2 text-sm font-semibold transition-colors hover:bg-bean-dark" data-testid="nav-admin-link">
            Admin
          </Link>
        </header>

        <main className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.3fr_1fr]">
          <div className="flex flex-col items-center text-center animate-rise lg:items-start lg:text-left">
            <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-36 sm:h-44" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.35em] text-foam">{settings.tagline}</p>
            <h1 className="mt-3 text-5xl font-semibold leading-[1.05] sm:text-6xl" data-testid="home-title">
              {settings.shop_name}
            </h1>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(table, 10);
              if (n > 0) nav(`/t/${n}`);
            }}
            className="rounded-[2rem] bg-cream p-7 text-espresso shadow-2xl animate-rise [animation-delay:120ms]"
            data-testid="home-table-form"
          >
            <h2 className="text-3xl font-semibold">Open table menu</h2>
            <p className="mt-1 text-sm text-muted-foreground">Enter the table number shown on your table.</p>
            <div className="mt-5 flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest">Table #</span>
              <Input
                type="number"
                min={1}
                inputMode="numeric"
                required
                value={table}
                onChange={(e) => setTable(e.target.value)}
                className="h-12 w-28 rounded-full bg-white text-center text-lg font-bold"
                data-testid="home-table-input"
              />
            </div>
            <button
              type="submit"
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-bean font-bold tracking-wider text-white transition-[background-color,transform] hover:bg-bean-dark active:scale-[0.98]"
              data-testid="home-open-menu-button"
            >
              VIEW MENU <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
