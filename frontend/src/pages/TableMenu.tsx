import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  Smartphone,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import BrandMark from "@/components/BrandMark";
import { FulfillmentBadge, StatusBadge } from "@/components/ReceiptView";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { METHOD_LABEL, money, orderNo } from "@/lib/format";
import { errorText, useMenu, useSettings } from "@/lib/queries";
import type { OrderCreate, OrderTicket, PaymentMethod, Product, PublicTable } from "@/lib/types";
import { cn } from "@/lib/utils";

type Step = "menu" | "review" | "payment" | "done";
type Cart = Record<string, number>;

const newToken = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function Stepper({ qty, onDec, onInc, testId, dark }: { qty: number; onDec: () => void; onInc: () => void; testId: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-1 rounded-full p-1", dark ? "bg-roast/90" : "bg-white/90 border border-[#DFCABB]")}>
      <button
        type="button"
        onClick={onDec}
        disabled={qty === 0}
        className="grid h-7 w-7 place-items-center rounded-full bg-bean text-white transition-[background-color,transform] hover:bg-bean-dark active:scale-90 disabled:opacity-30"
        aria-label="Decrease"
        data-testid={`${testId}-decrease`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span key={qty} className={cn("w-6 text-center text-sm font-bold animate-pop", dark ? "text-white" : "text-espresso")} data-testid={`${testId}-qty`}>
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        className="grid h-7 w-7 place-items-center rounded-full bg-bean text-white transition-[background-color,transform] hover:bg-bean-dark active:scale-90"
        aria-label="Increase"
        data-testid={`${testId}-increase`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function ProductTile({ p, qty, setQty, index }: { p: Product; qty: number; setQty: (n: number) => void; index: number }) {
  return (
    <div
      className={cn(
        "group flex flex-col overflow-hidden rounded-3xl bg-latte/95 border border-[#DFCABB] shadow-[0_10px_30px_-12px_rgba(24,14,9,0.6)] animate-rise transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5",
        qty > 0 && "ring-2 ring-foam",
      )}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
      data-testid={`menu-product-${p.id}`}
    >
      <div className="relative aspect-square overflow-hidden bg-[#E9DCCB]">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8" />
          </div>
        )}
        {qty > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-bean px-2 py-0.5 text-[11px] font-bold text-white shadow">x{qty}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="min-h-0 flex-1">
          <p className="font-heading text-[15px] font-semibold leading-tight text-espresso line-clamp-2" data-testid={`menu-product-name-${p.id}`}>
            {p.name}
          </p>
          <p className="mt-0.5 text-sm font-bold text-bean" data-testid={`menu-product-price-${p.id}`}>
            {money(p.price)}
          </p>
        </div>
        <div className="flex justify-center">
          <Stepper qty={qty} onDec={() => setQty(Math.max(0, qty - 1))} onInc={() => setQty(Math.min(99, qty + 1))} testId={`menu-product-${p.id}`} />
        </div>
      </div>
    </div>
  );
}

export default function TableMenu() {
  const params = useParams();
  const table = Number(params.table);
  const { settings } = useSettings();
  const menu = useMenu();
  const [cart, setCart] = useState<Cart>({});
  const [step, setStep] = useState<Step>("menu");
  const [category, setCategory] = useState("All");
  const [nickname, setNickname] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [card, setCard] = useState({ number: "", holder: "", month: "", year: "", cvv: "" });
  const [placed, setPlaced] = useState<OrderTicket | null>(null);
  const [token, setToken] = useState(newToken);

  const isNum = Number.isInteger(table) && table >= 1;
  const tableQ = useQuery({
    queryKey: ["table", table],
    queryFn: () => apiGet<PublicTable>(`/tables/${table}`),
    enabled: isNum,
    retry: (n, e) => !(e instanceof ApiError && e.status === 404) && n < 2,
  });
  const tableMissing = !isNum || (tableQ.error instanceof ApiError && tableQ.error.status === 404);
  const tableInactive = tableQ.data ? !tableQ.data.active : false;
  // Unreachable backend (static preview) still shows the menu shell; ordering then fails with a clear toast.
  const validTable = isNum && !tableMissing && !tableInactive;
  const products = useMemo(() => (menu.isError ? [] : menu.data ?? []), [menu.data, menu.isError]);
  const byId = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);
  const lines = Object.entries(cart)
    .filter(([id, q]) => q > 0 && byId[id])
    .map(([id, qty]) => ({ p: byId[id], qty }));
  const totalQty = lines.reduce((s, l) => s + l.qty, 0);
  const total = lines.reduce((s, l) => s + l.qty * l.p.price, 0);
  const cats = ["All", ...settings.categories.filter((c) => products.some((p) => p.category === c))];
  const shown = category === "All" ? products : products.filter((p) => p.category === category);

  const live = useQuery({
    queryKey: ["order-ticket", placed?.id],
    queryFn: () => apiGet<OrderTicket>(`/orders/${placed!.id}`),
    enabled: !!placed,
    refetchInterval: 6000,
  });
  const current = live.data ?? placed;

  const setQty = (id: string, n: number) => setCart((c) => ({ ...c, [id]: n }));

  const place = useMutation({
    mutationFn: (body: OrderCreate) => apiPost<OrderTicket>("/orders", body),
    onSuccess: (o) => {
      setPlaced(o);
      setCart({});
      setNotes("");
      setCard({ number: "", holder: "", month: "", year: "", cvv: "" });
      setToken(newToken());
      setStep("done");
      window.scrollTo({ top: 0 });
    },
    onError: (e) => toast.error(errorText(e, "Could not place your order")),
  });

  function submitOrder() {
    if (place.isPending) return;
    if (!nickname.trim()) return toast.error("Please enter your nickname");
    let reference = "";
    if (method === "card") {
      const digits = card.number.replace(/\D/g, "");
      if (digits.length < 12 || digits.length > 19) return toast.error("Enter a valid card number");
      if (!card.holder.trim()) return toast.error("Enter the card holder name");
      if (!/^(0?[1-9]|1[0-2])$/.test(card.month) || !/^\d{4}$/.test(card.year)) return toast.error("Enter a valid expiry date");
      if (!/^\d{3,4}$/.test(card.cvv)) return toast.error("Enter a valid CVV");
      reference = `Card **** ${digits.slice(-4)} / ${card.holder.trim()}`.slice(0, 60);
    }
    place.mutate({
      table_number: table,
      nickname: nickname.trim(),
      payment_method: method,
      payment_reference: reference,
      notes: notes.trim(),
      client_token: token,
      items: lines.map((l) => ({ product_id: l.p.id, qty: l.qty })),
    });
  }

  const header = (
    <header className="relative z-10 mx-auto flex w-full max-w-5xl items-start justify-between gap-3 px-4 pt-5 sm:px-8">
      <div className="w-16 sm:w-24" />
      <div className="flex flex-col items-center text-center">
        <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-24 sm:h-28" />
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#E5D2BF] sm:text-xs" data-testid="menu-tagline">
          {settings.tagline}
        </p>
      </div>
      <div className="flex w-16 justify-end sm:w-24">
        <div
          className="grid h-16 w-16 place-items-center rounded-full bg-bean text-center text-white shadow-lg ring-4 ring-white/20 animate-pulse-ring sm:h-20 sm:w-20"
          data-testid="table-badge"
        >
          <div className="leading-none">
            <p className="text-[9px] font-bold tracking-[0.2em] sm:text-[10px]">TABLE</p>
            <p className="font-heading text-2xl font-bold sm:text-3xl" data-testid="table-badge-number">#{isNum ? table : "?"}</p>
          </div>
        </div>
      </div>
    </header>
  );

  return (
    <div className="relative min-h-dvh bg-roast text-white">
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${settings.background_url})` }} />
      <div className="fixed inset-0 bg-[linear-gradient(180deg,rgba(24,14,9,0.78)_0%,rgba(43,24,16,0.55)_35%,rgba(24,14,9,0.9)_100%)]" />

      {header}

      {tableQ.data?.label && (
        <p className="relative z-10 mt-2 text-center text-xs font-semibold uppercase tracking-[0.25em] text-foam" data-testid="table-label">
          {tableQ.data.label}
        </p>
      )}

      {!validTable ? (
        <main className="relative z-10 mx-auto mt-12 max-w-md px-6 text-center" data-testid="invalid-table">
          <h1 className="text-3xl font-semibold">{tableInactive ? "Table not available" : "Table not found"}</h1>
          <p className="mt-2 text-[#E5D2BF]">
            {tableInactive
              ? "This table is currently not accepting orders. Please ask our staff for assistance."
              : "Please scan the QR code placed on your table again."}
          </p>
        </main>
      ) : step === "menu" ? (
        <main className="relative z-10 mx-auto max-w-5xl px-4 pb-36 pt-6 sm:px-8">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-4" data-testid="category-pills">
            {cats.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-[background-color,color] duration-200",
                  category === c ? "bg-bean text-white shadow-md" : "bg-white/15 text-[#FFF9F2] backdrop-blur-md hover:bg-white/25",
                )}
                data-testid={`category-pill-${c.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {c}
              </button>
            ))}
          </div>

          {menu.isLoading ? (
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 sm:gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-white/10" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-3xl bg-white/10 p-10 text-center backdrop-blur-md" data-testid="menu-empty">
              <p className="font-heading text-xl">Menu is not available right now</p>
              <p className="mt-1 text-sm text-[#E5D2BF]">Please ask our staff for assistance.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 min-[420px]:grid-cols-3 md:grid-cols-4 sm:gap-4" data-testid="menu-grid">
              {shown.map((p, i) => (
                <ProductTile key={p.id} p={p} index={i} qty={cart[p.id] ?? 0} setQty={(n) => setQty(p.id, n)} />
              ))}
            </div>
          )}

          <div className="fixed inset-x-0 bottom-0 z-20 p-3 sm:p-5">
            <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-full border border-white/10 bg-roast/90 p-2 pl-5 shadow-2xl backdrop-blur-xl">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-[#D6BEA8]">Total</p>
                <p className="truncate font-heading text-xl font-bold" data-testid="menu-cart-total">
                  {money(total)} <span className="font-sans text-xs font-medium text-[#D6BEA8]">/ {totalQty} item{totalQty === 1 ? "" : "s"}</span>
                </p>
              </div>
              <Button
                disabled={totalQty === 0}
                onClick={() => setStep("review")}
                className="h-12 rounded-full bg-bean px-6 text-sm font-bold tracking-wider hover:bg-bean-dark transition-[background-color,transform] active:scale-95"
                data-testid="menu-done-button"
              >
                <ShoppingBag className="h-4 w-4" /> DONE
              </Button>
            </div>
          </div>
        </main>
      ) : step === "review" ? (
        <main className="relative z-10 mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-8 animate-rise" data-testid="review-step">
          <div className="rounded-[2rem] bg-cream p-5 text-espresso shadow-2xl sm:p-7">
            <h1 className="text-3xl font-semibold">Orders</h1>
            <p className="text-sm text-muted-foreground">Table #{table} - please review before confirming.</p>
            <div className="mt-5 space-y-3">
              {lines.map(({ p, qty }) => (
                <div key={p.id} className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border" data-testid={`review-line-${p.id}`}>
                  <img src={p.image_url} alt="" className="h-16 w-16 rounded-xl object-cover bg-latte" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{money(p.price)} each</p>
                    <p className="text-sm font-bold text-bean">{money(p.price * qty)}</p>
                  </div>
                  <Stepper qty={qty} onDec={() => setQty(p.id, qty - 1)} onInc={() => setQty(p.id, Math.min(99, qty + 1))} testId={`review-line-${p.id}`} />
                </div>
              ))}
              {lines.length === 0 && <p className="text-sm text-muted-foreground">Your order is empty.</p>}
            </div>
            <div className="mt-5 space-y-1 rounded-2xl bg-latte p-4">
              <div className="flex justify-between text-sm">
                <span className="font-semibold uppercase tracking-wider">Quantity</span>
                <span className="font-bold" data-testid="review-quantity">{totalQty}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-semibold uppercase tracking-wider">Total</span>
                <span className="font-heading text-2xl font-bold text-bean" data-testid="review-total">{money(total)}</span>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setStep("menu")} className="h-12 rounded-full border-bean text-bean font-bold tracking-wider" data-testid="review-back-button">
                <ArrowLeft className="h-4 w-4" /> BACK
              </Button>
              <Button
                disabled={totalQty === 0}
                onClick={() => setStep("payment")}
                className="h-12 rounded-full bg-bean font-bold tracking-wider hover:bg-bean-dark"
                data-testid="review-confirm-button"
              >
                CONFIRM ORDER
              </Button>
            </div>
          </div>
        </main>
      ) : step === "payment" ? (
        <main className="relative z-10 mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-8 animate-rise" data-testid="payment-step">
          <div className="rounded-[2rem] bg-cream p-5 text-espresso shadow-2xl sm:p-7">
            <h1 className="text-3xl font-semibold">Payment method</h1>
            <p className="text-sm text-muted-foreground">
              Amount due <span className="font-bold text-bean">{money(total)}</span>. The cashier will confirm your payment.
            </p>

            <div className="mt-5 space-y-1.5">
              <Label htmlFor="nickname" className="text-xs font-bold uppercase tracking-widest">Nickname</Label>
              <Input
                id="nickname"
                value={nickname}
                maxLength={40}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="So we know who to serve"
                className="h-12 rounded-full bg-white px-5"
                data-testid="payment-nickname-input"
              />
            </div>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest">
                Notes <span className="font-medium normal-case tracking-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                maxLength={300}
                rows={2}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. less sugar, no ice"
                className="rounded-2xl bg-white px-5"
                data-testid="payment-notes-input"
              />
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {([
                ["cash", "Cash", Banknote],
                ["gcash", "GCash", Smartphone],
                ["card", "Card / ATM", CreditCard],
              ] as const).map(([m, label, Icon]) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-4 text-sm font-bold uppercase tracking-wider transition-[background-color,border-color,color] duration-200",
                    method === m ? "border-bean bg-bean text-white shadow-lg" : "border-[#DFCABB] bg-white text-espresso hover:border-bean",
                  )}
                  data-testid={`payment-method-${m}`}
                >
                  <Icon className="h-6 w-6" /> {label}
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-white p-4 border animate-rise" key={method}>
              {method === "cash" && (
                <p className="text-sm leading-relaxed" data-testid="payment-cash-info">
                  Pay in cash at the counter or ask our staff to bill out after your meal. Your order will be sent to the cashier right away.
                </p>
              )}
              {method === "gcash" && (
                <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center" data-testid="payment-gcash-info">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-bean">Scan to pay</p>
                    <div className="grid h-48 w-48 place-items-center rounded-2xl border-2 border-bean bg-white p-2">
                      {settings.gcash_qr_url ? (
                        <img src={settings.gcash_qr_url} alt="GCash QR code" className="h-full w-full object-contain" data-testid="payment-gcash-qr-image" />
                      ) : (
                        <div className="px-3 text-center text-xs text-muted-foreground" data-testid="payment-gcash-qr-missing">
                          <QrCode className="mx-auto mb-2 h-8 w-8" />
                          GCash QR not available. Please ask the cashier.
                        </div>
                      )}
                    </div>
                  </div>
                  <dl className="space-y-3">
                    <div className="rounded-2xl bg-cream px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Account name</dt>
                      <dd className="mt-0.5 break-words text-base font-semibold" data-testid="payment-gcash-name">{settings.gcash_name || "-"}</dd>
                    </div>
                    <div className="rounded-2xl bg-cream px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Account number</dt>
                      <dd className="mt-0.5 font-mono text-base font-semibold tracking-wider" data-testid="payment-gcash-number">{settings.gcash_number || "-"}</dd>
                    </div>
                    <div className="rounded-2xl bg-cream px-4 py-3">
                      <dt className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Amount</dt>
                      <dd className="mt-0.5 font-heading text-xl font-bold text-bean">{money(total)}</dd>
                    </div>
                  </dl>
                  <p className="text-xs text-muted-foreground sm:col-span-2">
                    After sending, show your GCash confirmation to the cashier. Your order is marked paid only after the cashier verifies it.
                  </p>
                </div>
              )}
              {method === "card" && (
                <div className="space-y-3" data-testid="payment-card-form">
                  <p className="text-xs font-bold uppercase tracking-widest text-bean">Payment details</p>
                  <Input inputMode="numeric" placeholder="Card number" value={card.number} maxLength={23}
                    onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, "") })}
                    className="h-11 rounded-full px-5" data-testid="payment-card-number-input" />
                  <Input placeholder="Card holder name" value={card.holder}
                    onChange={(e) => setCard({ ...card, holder: e.target.value })}
                    className="h-11 rounded-full px-5" data-testid="payment-card-holder-input" />
                  <div className="grid grid-cols-3 gap-2">
                    <Input inputMode="numeric" placeholder="MM" maxLength={2} value={card.month}
                      onChange={(e) => setCard({ ...card, month: e.target.value.replace(/\D/g, "") })}
                      className="h-11 rounded-full text-center" data-testid="payment-card-month-input" />
                    <Input inputMode="numeric" placeholder="YYYY" maxLength={4} value={card.year}
                      onChange={(e) => setCard({ ...card, year: e.target.value.replace(/\D/g, "") })}
                      className="h-11 rounded-full text-center" data-testid="payment-card-year-input" />
                    <Input inputMode="numeric" type="password" placeholder="CVV" maxLength={4} value={card.cvv}
                      onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })}
                      className="h-11 rounded-full text-center" data-testid="payment-card-cvv-input" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">Only the last 4 digits and the card holder name are saved. CVV and expiry are never stored. The cashier verifies the card payment at the terminal.</p>
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => setStep("review")} className="h-12 rounded-full border-bean text-bean font-bold tracking-wider" data-testid="payment-cancel-button">
                CANCEL
              </Button>
              <Button
                disabled={place.isPending || totalQty === 0}
                onClick={submitOrder}
                className="h-12 rounded-full bg-bean font-bold tracking-wider hover:bg-bean-dark"
                data-testid="payment-submit-button"
              >
                {place.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {method === "cash" ? "PLACE ORDER" : "CONFIRM AND PAY"}
              </Button>
            </div>
          </div>
        </main>
      ) : (
        current && (
          <main className="relative z-10 mx-auto max-w-lg px-4 pb-10 pt-6 sm:px-8 animate-rise" data-testid="done-step">
            <div className="rounded-[2rem] bg-cream p-6 text-espresso shadow-2xl sm:p-8">
              <CheckCircle2 className="h-12 w-12 text-bean" />
              <h1 className="mt-3 text-4xl font-semibold break-words" data-testid="done-title">Thank you, {current.nickname}!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Order <span className="font-bold text-espresso" data-testid="done-order-number">{orderNo(current.order_number)}</span> ({current.item_count} item{current.item_count === 1 ? "" : "s"}) for Table #{current.table_number} was sent to the cashier.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <FulfillmentBadge value={current.fulfillment} testId="done-order-fulfillment" />
                <StatusBadge status={current.status} testId="done-order-status" />
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {METHOD_LABEL[current.payment_method]}
                </span>
              </div>
              <div className="mt-5 rounded-2xl bg-latte p-4 text-sm leading-relaxed" data-testid="done-instructions">
                {current.status === "cancelled"
                  ? "This order was cancelled by the cashier. Please ask our staff for assistance."
                  : current.payment_method === "cash"
                    ? "Kindly ask for assistance to bill out after your meal. Enjoy!"
                    : current.status === "paid"
                      ? "Your payment has been confirmed by the cashier. Your billing statement will be given together with your food."
                      : `The cashier is verifying your ${METHOD_LABEL[current.payment_method]} payment. Your billing statement will be given together with your food.`}
              </div>
              <Button
                onClick={() => {
                  setPlaced(null);
                  setStep("menu");
                }}
                className="mt-5 h-12 w-full rounded-full bg-bean font-bold hover:bg-bean-dark"
                data-testid="done-order-more-button"
              >
                Order more
              </Button>
            </div>
          </main>
        )
      )}

      <footer className="relative z-10 pb-6 text-center text-[11px] text-[#D6BEA8]/80 no-print">
        <Link to="/" className="hover:text-white" data-testid="menu-footer-link">{settings.shop_name}</Link>
      </footer>

    </div>
  );
}
