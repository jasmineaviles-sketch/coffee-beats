import { useState } from "react";
import { cn } from "@/lib/utils";
import { OFFICIAL_LOGO } from "@/lib/queries";

interface Props {
  logoUrl?: string;
  name?: string;
  className?: string;
}

/** Business logo. Uses the logo set in admin Settings; falls back to the official logo file. */
export default function BrandMark({ logoUrl, name = "Coffee Beats by Life", className }: Props) {
  const [failed, setFailed] = useState<string | null>(null);
  const src = logoUrl && failed !== logoUrl ? logoUrl : OFFICIAL_LOGO;
  return (
    <span
      className={cn("inline-grid aspect-square h-20 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-lg ring-1 ring-black/5", className)}
      data-testid="brand-logo"
    >
      <img
        src={src}
        alt={`${name} logo`}
        className="h-full w-full object-contain"
        onError={() => logoUrl && setFailed(logoUrl)}
        data-testid="brand-logo-image"
      />
    </span>
  );
}
