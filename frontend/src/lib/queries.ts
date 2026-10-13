import { useQuery } from "@tanstack/react-query";
import { ApiError, apiGet } from "./api";
import type { Me, Product, Settings } from "./types";

export const OFFICIAL_LOGO = "/brand/logo.png";

export const DEFAULT_SETTINGS: Settings = {
  shop_name: "Coffee Beats by Life",
  tagline: "Stay for a moment. Crafted for life.",
  logo_url: OFFICIAL_LOGO,
  background_url:
    "https://images.unsplash.com/photo-1772188378544-4f37fb074350?auto=format&fit=crop&w=1600&q=80",
  categories: ["Coffee", "Non-Coffee", "Pastries", "Meals"],
  gcash_name: "",
  gcash_number: "",
  gcash_qr_url: "",
  receipt_footer: "Thank you for staying for a moment. Please come again.",
  terms_text: "",
};

export function useSettings() {
  const q = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<Settings>("/settings") });
  return { ...q, settings: q.data ?? DEFAULT_SETTINGS };
}

export function useMenu() {
  return useQuery({ queryKey: ["menu"], queryFn: () => apiGet<Product[]>("/products") });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await apiGet<Me>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
  });
}

export function errorText(e: unknown, fallback = "Something went wrong"): string {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | null;
    if (body && typeof body.detail === "string") return body.detail;
    if (body && Array.isArray(body.detail)) {
      const first = body.detail[0] as { loc?: unknown[]; msg?: string } | undefined;
      const field = first?.loc?.[first.loc.length - 1];
      return first?.msg ? `${field ? `${String(field)}: ` : ""}${first.msg}` : "Please check the fields and try again";
    }
    if (e.status === 401) return "Your session expired. Please sign in again.";
    if (e.status >= 500) return "Server error. Please try again.";
  }
  if (e instanceof TypeError) return "Cannot reach the server. Check your connection.";
  return fallback;
}
