"use client";

// Reusable "MTG mana symbol" pill — used wherever we need to show a
// single color identifier (e.g. WUBRG color filter buttons). Solid
// rounded circle with the color letter on the MTG palette background.

export type ManaColor = "W" | "U" | "B" | "R" | "G" | "C";

const MANA_META: Record<ManaColor, { label: string; bg: string; text: string }> = {
  W: { label: "W", bg: "#f5f5f4", text: "#1a1a1a" },
  U: { label: "U", bg: "#60a5fa", text: "#ffffff" },
  B: { label: "B", bg: "#404040", text: "#f5f5f4" },
  R: { label: "R", bg: "#f87171", text: "#ffffff" },
  G: { label: "G", bg: "#4ade80", text: "#ffffff" },
  C: { label: "C", bg: "#9ca3af", text: "#ffffff" },
};

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
  const meta = MANA_META[color];
  return (
    <span
      title={title ?? meta.label}
      className={`inline-flex items-center justify-center rounded-full font-bold transition-all ${SIZE_CLASSES[size]} ${
        active ? "" : "opacity-40"
      } ${className}`}
      style={{ backgroundColor: meta.bg, color: meta.text }}
    >
      {meta.label}
    </span>
  );
}

export { MANA_META };
