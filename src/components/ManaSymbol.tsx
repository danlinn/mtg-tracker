"use client";

// Reusable "MTG mana symbol" pill — used wherever we need to show a
// single color identifier (e.g. WUBRG color filter buttons). Solid
// rounded circle on the active theme's palette color, with an iconic
// glyph for the color (sun / droplet / skull / flame / tree / diamond).
//
// Background comes from the theme palette; the glyph is drawn in
// currentColor so it picks up the palette's contrasting text color.

import { useThemePalette } from "@/lib/theme";
import type { ColorKey } from "@/lib/themePalettes";

export type ManaColor = ColorKey;

type Size = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

const GLYPH_CLASSES: Record<Size, string> = {
  sm: "w-[14px] h-[14px]",
  md: "w-5 h-5",
  lg: "w-6 h-6",
};

// Iconic glyph per MTG color. Each path is drawn in `currentColor`
// on top of the palette-coloured pill, so contrast stays correct in
// every theme.
const GLYPHS: Record<ColorKey, React.ReactNode> = {
  // Sun: filled center + 8 rays
  W: (
    <>
      <circle cx="12" cy="12" r="3.5" />
      <g
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      >
        <line x1="12" y1="2.5" x2="12" y2="5.5" />
        <line x1="12" y1="18.5" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="5.5" y2="12" />
        <line x1="18.5" y1="12" x2="21.5" y2="12" />
        <line x1="5.3" y1="5.3" x2="7.4" y2="7.4" />
        <line x1="16.6" y1="16.6" x2="18.7" y2="18.7" />
        <line x1="5.3" y1="18.7" x2="7.4" y2="16.6" />
        <line x1="16.6" y1="7.4" x2="18.7" y2="5.3" />
      </g>
    </>
  ),
  // Water droplet
  U: (
    <path d="M12 3 C12 3, 5 11.5, 5 15 A7 7 0 0 0 19 15 C19 11.5, 12 3, 12 3 Z" />
  ),
  // Skull: dome with two eye sockets (evenodd so eyes cut through)
  B: (
    <path
      fillRule="evenodd"
      d="M12 3 C7.6 3, 4 6.6, 4 11 C4 13.2, 5 15, 6.5 16.3 V20 H9.5 V18 H11 V20 H13 V18 H14.5 V20 H17.5 V16.3 C19 15, 20 13.2, 20 11 C20 6.6, 16.4 3, 12 3 Z M9.5 10.5 A1.6 1.6 0 1 1 9.5 13.7 A1.6 1.6 0 0 1 9.5 10.5 Z M14.5 10.5 A1.6 1.6 0 1 1 14.5 13.7 A1.6 1.6 0 0 1 14.5 10.5 Z"
    />
  ),
  // Flame: teardrop with a small curl inside
  R: (
    <path d="M12 2.5 C12 2.5, 7.5 7.5, 7.5 12.5 C7.5 15.8, 9.5 18, 12 18 C14.5 18, 16.5 16, 16.5 13.5 C16.5 12, 15.8 11, 15 10.5 C15.2 11.5, 14.8 12.5, 14 12.5 C13 12.5, 12.8 11.5, 13 10 C13.2 8, 12.5 5.5, 12 2.5 Z" />
  ),
  // Pine tree: 3 triangular layers on a trunk
  G: (
    <path d="M12 2.5 L8.5 8 H10 L6.5 13 H8.5 L4.5 18 H10.5 V21 H13.5 V18 H19.5 L15.5 13 H17.5 L14 8 H15.5 L12 2.5 Z" />
  ),
  // Colorless: diamond
  C: <path d="M12 3 L4 12 L12 21 L20 12 Z" />,
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
      aria-label={title ?? color}
      className={`inline-flex items-center justify-center rounded-full transition-all ${SIZE_CLASSES[size]} ${
        active ? "" : "opacity-40"
      } ${className}`}
      style={{ backgroundColor: swatch.hex, color: swatch.text }}
    >
      <svg
        className={GLYPH_CLASSES[size]}
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        {GLYPHS[color]}
      </svg>
    </span>
  );
}
