import type { PaymentMethod } from "./types";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
export const money = (n: number) => peso.format(n);

export const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Cash",
  gcash: "GCash",
  card: "Card",
};

export function fmtDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

/** Turn Imgur page links (imgur.com/abc) into direct image links (i.imgur.com/abc.jpg). */
export function normalizeImageUrl(url: string): string {
  const u = url.trim();
  const m = u.match(/^https?:\/\/(?:www\.)?imgur\.com\/([a-zA-Z0-9]+)$/);
  if (m) return `https://i.imgur.com/${m[1]}.jpg`;
  return u;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function orderNo(n: number): string {
  return `#${String(n).padStart(4, "0")}`;
}
