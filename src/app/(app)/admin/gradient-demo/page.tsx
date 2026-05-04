"use client";

import { useThemePalette } from "@/lib/theme";
import type { ColorKey } from "@/lib/themePalettes";
import { textOn } from "@/lib/themePalettes";
import { GRADIENT_STYLES } from "@/lib/gradientStyles";

const SAMPLE_COMBOS: { label: string; combo: ColorKey[] }[] = [
  { label: "WU (Azorius)", combo: ["W", "U"] },
  { label: "BRG (Jund)", combo: ["B", "R", "G"] },
  { label: "WUBRG (5-color)", combo: ["W", "U", "B", "R", "G"] },
  { label: "WB (Orzhov)", combo: ["W", "B"] },
  { label: "UR (Izzet)", combo: ["U", "R"] },
];

export default function GradientDemoPage() {
  const palette = useThemePalette();

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Gradient Style Mockups</h1>
      <p className="text-sm text-text-tertiary">
        Each row shows one gradient style applied to different color combos.
        Switch themes in the menu to see how they adapt.
      </p>

      {GRADIENT_STYLES.map((style) => (
        <div key={style.name} className="space-y-2">
          <div>
            <h2 className="text-lg font-semibold">{style.label}</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {SAMPLE_COMBOS.map((sample) => {
              const bg = style.fn(sample.combo, palette);
              const color = textOn(bg);
              return (
                <div
                  key={sample.label}
                  className="flex-shrink-0 w-40 h-28 rounded-xl flex flex-col items-center justify-center border border-white/20 shadow-md"
                  style={{ background: bg, color }}
                >
                  <span className="text-2xl font-bold" style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>
                    40
                  </span>
                  <span className="text-[10px] font-medium mt-1 opacity-80">
                    {sample.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
