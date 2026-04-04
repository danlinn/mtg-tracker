"use client";

const COLOR_MAP: Record<string, { label: string; bg: string; textColor: string }> = {
  W: { label: "W", bg: "bg-yellow-100", textColor: "#111" },
  U: { label: "U", bg: "bg-blue-500", textColor: "#fff" },
  B: { label: "B", bg: "bg-gray-800", textColor: "#eee" },
  R: { label: "R", bg: "bg-red-500", textColor: "#fff" },
  G: { label: "G", bg: "bg-green-600", textColor: "#fff" },
};

interface ColorPipsProps {
  colors: { W: boolean; U: boolean; B: boolean; R: boolean; G: boolean };
}

export default function ColorPips({ colors }: ColorPipsProps) {
  const active = Object.entries(colors).filter(([, v]) => v);
  if (active.length === 0) {
    return <span className="text-gray-400 text-xs">Colorless</span>;
  }
  return (
    <div className="flex gap-1">
      {active.map(([key]) => {
        const c = COLOR_MAP[key];
        return (
          <span
            key={key}
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${c.bg}`}
            style={{ color: c.textColor }}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
