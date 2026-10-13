import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, LockKeyhole, ScrollText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import BrandMark from "@/components/BrandMark";
import { apiPost } from "@/lib/api";
import { errorText, useSettings } from "@/lib/queries";
import { beginSession } from "@/lib/session";
import type { LoginIn, Me, Role } from "@/lib/types";

interface Props {
  portal: Role;
  title: string;
  subtitle: string;
}

/** Staff sign-in. The admin portal requires accepting the Terms and Conditions. */
export default function StaffLogin({ portal, title, subtitle }: Props) {
  const { settings } = useSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const needsTerms = portal === "admin";

  const login = useMutation({
    mutationFn: (body: LoginIn) => apiPost<Me>("/auth/login", body),
    onSuccess: (me) => {
      beginSession(me);
      toast.success(`Welcome, ${me.username}`);
    },
    onError: (e) => toast.error(errorText(e, "Login failed")),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (needsTerms && !accepted) {
      toast.error("Please read and accept the Terms and Conditions");
      return;
    }
    login.mutate({ username, password, portal, accept_terms: accepted });
  }

  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr] bg-cream">
      <div
        className="relative hidden lg:flex flex-col justify-between p-12 text-[#FFF9F2] bg-cover bg-center"
        style={{ backgroundImage: `url(${settings.background_url})` }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(24,14,9,0.80)_0%,rgba(43,24,16,0.62)_50%,rgba(24,14,9,0.92)_100%)]" />
        <div className="relative">
          <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-28" />
        </div>
        <div className="relative max-w-md animate-rise">
          <p className="text-xs uppercase tracking-[0.3em] text-foam">{settings.tagline}</p>
          <h2 className="mt-3 text-5xl font-semibold leading-tight">{settings.shop_name}</h2>
          <p className="mt-4 text-[#E5D2BF]">Staff portal for table orders, payments, menu and store settings.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6 animate-rise" data-testid={`${portal}-login-form`}>
          <div className="lg:hidden flex justify-center">
            <BrandMark logoUrl={settings.logo_url} name={settings.shop_name} className="h-28" />
          </div>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-bean">
              <LockKeyhole className="h-3.5 w-3.5" /> Staff only
            </span>
            <h1 className="mt-3 text-3xl font-semibold text-espresso" data-testid={`${portal}-login-title`}>
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 rounded-xl bg-white"
                data-testid={`${portal}-login-username-input`}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl bg-white pr-11"
                  data-testid={`${portal}-login-password-input`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-bean transition-colors"
                  aria-label={show ? "Hide password" : "Show password"}
                  data-testid={`${portal}-login-toggle-password`}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {needsTerms && (
            <div className="rounded-2xl border bg-white p-4 flex items-start gap-3">
              <Checkbox
                checked={accepted}
                onCheckedChange={(v) => setAccepted(Boolean(v))}
                data-testid="admin-login-terms-checkbox"
                className="mt-0.5"
              />
              <p className="text-sm leading-snug text-espresso">
                I have read and agree to the{" "}
                <button
                  type="button"
                  className="font-semibold text-bean underline underline-offset-2"
                  onClick={() => setTermsOpen(true)}
                  data-testid="admin-login-terms-open"
                >
                  Terms and Conditions
                </button>
                .
              </p>
            </div>
          )}

          <Button
            type="submit"
            disabled={login.isPending}
            className="h-12 w-full rounded-full bg-bean text-base font-semibold hover:bg-bean-dark transition-colors active:scale-[0.98]"
            data-testid={`${portal}-login-submit-button`}
          >
            {login.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <a href="/" className="block text-center text-xs text-muted-foreground hover:text-bean" data-testid="login-back-home">
            Back to home
          </a>
        </form>
      </div>

      <Dialog open={termsOpen} onOpenChange={setTermsOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl" data-testid="terms-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ScrollText className="h-5 w-5 text-bean" /> Terms and Conditions
            </DialogTitle>
            <DialogDescription>Please read before signing in to the admin dashboard.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-2xl bg-cream p-4 text-sm leading-relaxed text-espresso" data-testid="terms-dialog-text">
            {settings.terms_text || "No terms have been set yet."}
          </div>
          <DialogFooter>
            <Button
              className="rounded-full bg-bean hover:bg-bean-dark"
              onClick={() => {
                setAccepted(true);
                setTermsOpen(false);
              }}
              data-testid="terms-dialog-accept-button"
            >
              I agree
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
