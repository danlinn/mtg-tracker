import type { ThemeName } from "@/lib/theme";

export type TextureName = "none" | "grit" | "hex-grid" | "circuit" | "scales" | "crosshatch" | "dots" | "diamonds" | "waves" | "stone" | "diagonal-streak" | "shimmer";

function svgUri(svg: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const TEXTURE_SVGS: Record<Exclude<TextureName, "none">, (opacity: number) => string> = {
  grit: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(#n)' opacity='${o}'/></svg>`),
  "hex-grid": (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='28' height='49'><path d='M14 0L28 8.5V24.5L14 33L0 24.5V8.5Z M14 16.5L28 25V41L14 49.5L0 41V25Z' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/></svg>`),
  circuit: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><path d='M0 20h15v-15M20 0v15h15M40 20h-15v15M20 40v-15h-15' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/><circle cx='20' cy='20' r='2' fill='white' fill-opacity='${o}'/></svg>`),
  scales: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20'><path d='M0 10A10 10 0 0120 10' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/><path d='M-10 20A10 10 0 0110 20' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/><path d='M10 20A10 10 0 0130 20' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/></svg>`),
  crosshatch: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><path d='M0 0L16 16M16 0L0 16' stroke='white' stroke-opacity='${o}' stroke-width='0.3'/></svg>`),
  dots: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12'><circle cx='6' cy='6' r='1' fill='white' fill-opacity='${o}'/></svg>`),
  diamonds: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><path d='M12 0L24 12L12 24L0 12Z' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/></svg>`),
  waves: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='10'><path d='M0 5Q10 0 20 5Q30 10 40 5' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.5'/></svg>`),
  stone: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect x='0' y='0' width='20' height='20' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.3'/><rect x='20' y='10' width='20' height='20' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.3'/><rect x='10' y='20' width='20' height='20' fill='none' stroke='white' stroke-opacity='${o}' stroke-width='0.3'/></svg>`),
  "diagonal-streak": (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='30' height='30'><line x1='0' y1='30' x2='30' y2='0' stroke='white' stroke-opacity='${o}' stroke-width='1'/><line x1='-5' y1='25' x2='25' y2='-5' stroke='white' stroke-opacity='${o * 0.5}' stroke-width='0.5'/><line x1='5' y1='35' x2='35' y2='5' stroke='white' stroke-opacity='${o * 0.5}' stroke-width='0.5'/></svg>`),
  shimmer: (o) => svgUri(`<svg xmlns='http://www.w3.org/2000/svg' width='60' height='60'><defs><linearGradient id='s' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='white' stop-opacity='0'/><stop offset='40%' stop-color='white' stop-opacity='${o}'/><stop offset='50%' stop-color='white' stop-opacity='${o * 2}'/><stop offset='60%' stop-color='white' stop-opacity='${o}'/><stop offset='100%' stop-color='white' stop-opacity='0'/></linearGradient></defs><rect width='60' height='60' fill='url(%23s)'/></svg>`),
};

export const THEME_DEFAULT_TEXTURE: Record<ThemeName, TextureName> = {
  default: "none",
  synth: "diagonal-streak",
  cyber: "none",
  flame: "none",
  chris: "none",
  phyrexia: "grit",
  "stained-glass": "shimmer",
  dungeon: "none",
  "neon-dynasty": "none",
  grixis: "grit",
};

export function getTextureBackground(name: TextureName, opacity: number = 0.1): string {
  if (name === "none") return "";
  return TEXTURE_SVGS[name](opacity);
}
