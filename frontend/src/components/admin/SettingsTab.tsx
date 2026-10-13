import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageField from "@/components/ImageField";
import PageHeader from "@/components/admin/PageHeader";
import { apiGet, apiPut } from "@/lib/api";
import { OFFICIAL_LOGO, errorText } from "@/lib/queries";
import type { CredentialsIn, Settings, StaffAccount } from "@/lib/types";

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-5 rounded-3xl border bg-white p-5 sm:p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function SettingsForm({ initial }: { initial: Settings }) {
  const qc = useQueryClient();
  const [s, setS] = useState<Settings>(initial);
  const [newCat, setNewCat] = useState("");
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const save = useMutation({
    mutationFn: (body: Settings) => apiPut<Settings>("/admin/settings", body),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
      setS(data);
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(errorText(e, "Could not save settings")),
  });

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!s.shop_name.trim()) return toast.error("Shop name is required");
        const digits = s.gcash_number.replace(/\D/g, "");
        if (s.gcash_number && (digits.length < 10 || digits.length > 13)) return toast.error("GCash account number must have 10 to 13 digits");
        save.mutate(s);
      }}
      data-testid="settings-form"
    >
      <Section title="Branding" desc="Shop name, tagline, logo and the background photo used on the menu.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name">
            <Input value={s.shop_name} onChange={(e) => set("shop_name", e.target.value)} className="rounded-xl" data-testid="settings-shop-name-input" />
          </Field>
          <Field label="Tagline">
            <Input value={s.tagline} onChange={(e) => set("tagline", e.target.value)} className="rounded-xl" data-testid="settings-tagline-input" />
          </Field>
        </div>
        <div className="space-y-2">
          <ImageField label="Business logo (PNG, JPG, WEBP or GIF, max 4 MB)" value={s.logo_url} onChange={(v) => set("logo_url", v)} testId="settings-logo" />
          {s.logo_url !== OFFICIAL_LOGO && (
            <Button type="button" variant="ghost" size="sm" className="rounded-full text-bean" onClick={() => set("logo_url", OFFICIAL_LOGO)} data-testid="settings-logo-reset-button">
              <RotateCcw className="h-3.5 w-3.5" /> Use the official Coffee Beats by Life logo
            </Button>
          )}
        </div>
        <ImageField label="Menu background image" value={s.background_url} onChange={(v) => set("background_url", v)} testId="settings-background" aspect="wide" />
      </Section>

      <Section title="Menu categories" desc="Categories group products on the customer menu. Manage tables in the Table QR section.">
        <Field label="Categories">
          <div className="flex flex-wrap gap-2" data-testid="settings-categories">
            {s.categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-bean">
                {c}
                <button type="button" onClick={() => set("categories", s.categories.filter((x) => x !== c))} aria-label={`Remove ${c}`} data-testid={`settings-category-remove-${c}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="New category" className="max-w-xs rounded-xl" data-testid="settings-category-input" />
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                const c = newCat.trim();
                if (c && !s.categories.includes(c)) set("categories", [...s.categories, c]);
                setNewCat("");
              }}
              data-testid="settings-category-add-button"
            >
              Add
            </Button>
          </div>
        </Field>
      </Section>

      <Section title="GCash payment" desc="Shown to customers who choose GCash: the QR code, account name and account number are displayed separately.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GCash account name">
            <Input value={s.gcash_name} maxLength={80} onChange={(e) => set("gcash_name", e.target.value)} placeholder="Juan Dela Cruz" className="rounded-xl" data-testid="settings-gcash-name-input" />
          </Field>
          <Field label="GCash account number">
            <Input value={s.gcash_number} maxLength={30} inputMode="tel" onChange={(e) => set("gcash_number", e.target.value.replace(/[^\d\s+-]/g, ""))} placeholder="09XX XXX XXXX" className="rounded-xl font-mono" data-testid="settings-gcash-number-input" />
          </Field>
        </div>
        <ImageField label="GCash QR code image" value={s.gcash_qr_url} onChange={(v) => set("gcash_qr_url", v)} testId="settings-gcash-qr" />
      </Section>

      <Section title="Receipt and terms" desc="Receipt footer message, and the Terms and Conditions staff must accept to sign in to the admin dashboard.">
        <Field label="Receipt footer">
          <Input value={s.receipt_footer} onChange={(e) => set("receipt_footer", e.target.value)} className="rounded-xl" data-testid="settings-receipt-footer-input" />
        </Field>
        <Field label="Terms and Conditions">
          <Textarea value={s.terms_text} onChange={(e) => set("terms_text", e.target.value)} rows={10} className="rounded-xl font-mono text-xs" data-testid="settings-terms-input" />
        </Field>
      </Section>

      <div className="sticky bottom-4 flex justify-end">
        <Button type="submit" disabled={save.isPending} className="h-12 rounded-full bg-bean px-8 shadow-xl hover:bg-bean-dark" data-testid="settings-save-button">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
        </Button>
      </div>
    </form>
  );
}

function AccountRow({ acc }: { acc: StaffAccount }) {
  const qc = useQueryClient();
  const [username, setUsername] = useState(acc.username);
  const [password, setPassword] = useState("");
  const save = useMutation({
    mutationFn: (b: CredentialsIn) => apiPut<StaffAccount>(`/admin/accounts/${acc.role}`, b),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-accounts"] });
      setPassword("");
      toast.success(`${acc.role === "admin" ? "Admin" : "Cashier"} login updated`);
    },
    onError: (e) => toast.error(errorText(e, "Username needs 3+ characters and password 6+ characters")),
  });
  return (
    <form
      className="grid items-end gap-3 rounded-2xl bg-cream p-4 md:grid-cols-[90px_minmax(0,1fr)_minmax(0,1fr)_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({ username, password });
      }}
      data-testid={`account-form-${acc.role}`}
    >
      <p className="pb-2 text-sm font-bold uppercase tracking-wider">{acc.role}</p>
      <Field label="Username">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl bg-white" data-testid={`account-${acc.role}-username-input`} />
      </Field>
      <Field label="New password">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="min. 6 characters" className="rounded-xl bg-white" data-testid={`account-${acc.role}-password-input`} />
      </Field>
      <Button type="submit" disabled={save.isPending || password.length < 6} className="rounded-full bg-bean hover:bg-bean-dark" data-testid={`account-${acc.role}-save-button`}>
        <KeyRound className="h-4 w-4" /> Update
      </Button>
    </form>
  );
}

export default function SettingsTab() {
  const q = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/settings") });
  const acc = useQuery({ queryKey: ["admin-accounts"], queryFn: () => apiGet<StaffAccount[]>("/admin/accounts") });
  return (
    <div className="space-y-5 animate-rise">
      <PageHeader title="Settings" desc="Branding, GCash payment details, receipt text, terms and staff logins. Images can be uploaded or linked (Imgur links work)." />
      {q.data ? <SettingsForm initial={q.data} /> : q.isError ? <p className="text-sm text-destructive">{errorText(q.error, "Could not load settings")}</p> : <p className="text-sm text-muted-foreground">Loading settings...</p>}
      <Section title="Staff logins" desc="Change the username and password for the admin and cashier accounts.">
        {(acc.data ?? []).map((a) => (
          <AccountRow key={a.role + a.username} acc={a} />
        ))}
      </Section>
    </div>
  );
}
