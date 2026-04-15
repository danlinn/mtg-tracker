"use client";

// Reusable "MTG mana symbol" pill — used wherever we need to show a
// single color identifier (e.g. WUBRG color filter buttons). Solid
// rounded circle with the color letter on the MTG palette background.
//
// Colors are sourced from the active theme's palette so they look
// native in every theme.

import { useThemePalette } from "@/lib/theme";
import type { ColorKey } from "@/lib/themePalettes";

export type ManaColor = ColorKey;

type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-6 h-6 text-[10px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

interface ManaSymbolProps {
  color: ManaColor;
  size?: Size;
  active?: boolean;
  className?: string;
  title?: string;
}

export default function ManaSymbol({
  color,
  size = "md",
  active = true,
  className = "",
  title,
}: ManaSymbolProps) {
  const palette = useThemePalette();
  const swatch = palette[color];
  return (
    <span
      title={title ?? color}
      className={`inline-flex items-center justify-center rounded-full font-bold transition-all ${SIZE_CLASSES[size]} ${
        active ? "" : "opacity-40"
      } ${className}`}
      style={{ backgroundColor: swatch.hex, color: swatch.text }}
    >
      {color}
    </span>
  );
}
