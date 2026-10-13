import { useRef, useState } from "react";
import { ImageOff, Link2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiPost } from "@/lib/api";
import { fileToDataUrl, normalizeImageUrl } from "@/lib/format";
import { errorText } from "@/lib/queries";
import type { UploadOut } from "@/lib/types";

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  testId: string;
  aspect?: "square" | "wide";
}

/** Image picker: paste a link (Imgur supported) or upload a file from the device. */
export default function ImageField({ label, value, onChange, testId, aspect = "square" }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)) return toast.error("Only PNG, JPG, WEBP or GIF images are allowed");
    if (file.size > 4 * 1024 * 1024) return toast.error("Image must be 4 MB or smaller");
    setBusy(true);
    try {
      const res = await apiPost<UploadOut>("/admin/uploads", { data_url: await fileToDataUrl(file) });
      setBroken(false);
      onChange(res.url);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(errorText(e, "Upload failed"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-3">
        <div
          className={`${aspect === "wide" ? "h-20 w-32" : "h-20 w-20"} shrink-0 overflow-hidden rounded-2xl border bg-latte flex items-center justify-center`}
        >
          {value && !broken ? (
            <img
              src={value}
              alt=""
              data-testid={`${testId}-preview`}
              className="h-full w-full object-cover"
              onError={() => setBroken(true)}
            />
          ) : (
            <ImageOff className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={value}
              onChange={(e) => {
                setBroken(false);
                onChange(e.target.value);
              }}
              onBlur={(e) => onChange(normalizeImageUrl(e.target.value))}
              placeholder="https://i.imgur.com/... or any image link"
              className="pl-9 rounded-xl"
              data-testid={`${testId}-url-input`}
            />
          </div>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
              data-testid={`${testId}-file-input`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              data-testid={`${testId}-upload-button`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
            </Button>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => onChange("")}
                data-testid={`${testId}-clear-button`}
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
