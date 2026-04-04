"use client";

const COLOR_MAP: Record<string, { label: string; bg: string; text: string }> = {
  W: { label: "W", bg: "bg-yellow-100", text: "text-gray-900" },
  U: { label: "U", bg: "bg-blue-500", text: "text-white" },
  B: { label: "B", bg: "bg-gray-800", text: "text-gray-100" },
  R: { label: "R", bg: "bg-red-500", text: "text-white" },
  G: { label: "G", bg: "bg-green-600", text: "text-white" },
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
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${c.bg} ${c.text}`}
          >
            {c.label}
          </span>
        );
      })}
    </div>
  );
}
