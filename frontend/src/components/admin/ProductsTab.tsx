import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageOff, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import ImageField from "@/components/ImageField";
import PageHeader from "@/components/admin/PageHeader";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { money } from "@/lib/format";
import { errorText, useSettings } from "@/lib/queries";
import type { Message, Product, ProductIn } from "@/lib/types";
import { cn } from "@/lib/utils";

const EMPTY: ProductIn = { name: "", description: "", price: 0, category: "", image_url: "", available: true, sort_order: 0 };

function ProductForm({ initial, id, categories, onDone }: { initial: ProductIn; id: string | null; categories: string[]; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<ProductIn>({ ...initial, category: initial.category || categories[0] || "" });
  const [price, setPrice] = useState(initial.price ? String(initial.price) : "");
  const save = useMutation({
    mutationFn: (body: ProductIn) => (id ? apiPut<Product>(`/admin/products/${id}`, body) : apiPost<Product>("/admin/products", body)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success(id ? "Product updated" : "Product added");
      onDone();
    },
    onError: (e) => toast.error(errorText(e, "Could not save product")),
  });
  const cats = Array.from(new Set([...categories, ...(f.category ? [f.category] : [])]));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const p = Number(price);
        if (!f.name.trim()) return toast.error("Product name is required");
        if (!price || Number.isNaN(p) || p < 0) return toast.error("Enter a valid price");
        save.mutate({ ...f, name: f.name.trim(), price: p });
      }}
      data-testid="product-form"
    >
      <ImageField label="Product photo" value={f.image_url} onChange={(url) => setF({ ...f, image_url: url })} testId="product-image" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Name</Label>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="rounded-xl" data-testid="product-name-input" />
        </div>
        <div className="space-y-1.5">
          <Label>Price (PHP)</Label>
          <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-xl" data-testid="product-price-input" />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={f.category} onValueChange={(v: string) => setF({ ...f, category: v })}>
            <SelectTrigger className="w-full rounded-xl" data-testid="product-category-select">
              <SelectValue>{(v) => (v as string) || "Choose category"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {cats.map((c) => (
                <SelectItem key={c} value={c} data-testid={`product-category-option-${c}`}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="rounded-xl" rows={2} data-testid="product-description-input" />
        </div>
        <div className="space-y-1.5">
          <Label>Display order</Label>
          <Input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })} className="rounded-xl" data-testid="product-sort-input" />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium">
          <Checkbox checked={f.available} onCheckedChange={(v) => setF({ ...f, available: Boolean(v) })} data-testid="product-available-checkbox" />
          Available on menu
        </label>
      </div>
      <DialogFooter>
        <Button type="submit" disabled={save.isPending} className="rounded-full bg-bean hover:bg-bean-dark" data-testid="product-save-button">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Save product
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function ProductsTab() {
  const qc = useQueryClient();
  const { settings } = useSettings();
  const q = useQuery({ queryKey: ["admin-products"], queryFn: () => apiGet<Product[]>("/admin/products") });
  const [editing, setEditing] = useState<{ id: string | null; data: ProductIn } | null>(null);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  const del = useMutation({
    mutationFn: (id: string) => apiDelete<Message>(`/admin/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
      toast.success("Product deleted");
    },
    onError: (e) => toast.error(errorText(e)),
  });
  const toggle = useMutation({
    mutationFn: (p: Product) => apiPut<Product>(`/admin/products/${p.id}`, { ...p, available: !p.available }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["menu"] });
    },
    onError: (e) => toast.error(errorText(e)),
  });

  const products = (q.isError ? [] : q.data ?? []).filter(
    (p) => (cat === "All" || p.category === cat) && p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5 animate-rise">
      <PageHeader
        title="Products"
        desc="Names, prices, categories and photos shown on the customer menu. Hidden products do not appear on the menu."
        actions={
          <Button onClick={() => setEditing({ id: null, data: EMPTY })} className="rounded-full bg-bean hover:bg-bean-dark" data-testid="product-add-button">
            <Plus className="h-4 w-4" /> Add product
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-full bg-white pl-9" data-testid="product-search-input" />
        </div>
        {["All", ...settings.categories].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cn("rounded-full px-3 py-1.5 text-sm font-semibold transition-colors", cat === c ? "bg-espresso text-white" : "bg-white border hover:border-bean")}
            data-testid={`product-filter-${c.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-product-list">
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!q.isLoading && products.length === 0 && <p className="text-sm text-muted-foreground">No products found.</p>}
        {products.map((p) => (
          <div key={p.id} className={cn("flex gap-3 rounded-3xl border bg-white p-3 transition-opacity", !p.available && "opacity-60")} data-testid={`admin-product-${p.id}`}>
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-latte">
              {p.image_url ? <img src={p.image_url} alt="" className="h-full w-full object-cover" /> : <ImageOff className="m-auto mt-8 h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate font-semibold" data-testid={`admin-product-name-${p.id}`}>{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.category}</p>
              <p className="font-bold text-bean">{money(p.price)}</p>
              <div className="mt-auto flex items-center gap-1">
                <label className="mr-auto flex items-center gap-1.5 text-xs">
                  <Checkbox checked={p.available} onCheckedChange={() => toggle.mutate(p)} data-testid={`admin-product-available-${p.id}`} />
                  {p.available ? "Available" : "Hidden"}
                </label>
                <Button size="icon-sm" variant="ghost" className="rounded-full" onClick={() => setEditing({ id: p.id, data: p })} data-testid={`admin-product-edit-${p.id}`} aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="rounded-full text-destructive hover:text-destructive"
                  onClick={() => window.confirm(`Delete ${p.name}?`) && del.mutate(p.id)}
                  data-testid={`admin-product-delete-${p.id}`}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-3xl sm:max-w-lg" data-testid="product-dialog">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit product" : "Add product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <ProductForm key={editing.id ?? "new"} id={editing.id} initial={editing.data} categories={settings.categories} onDone={() => setEditing(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
