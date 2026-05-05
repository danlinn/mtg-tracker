import type { Palette } from "@/lib/themePalettes";
import { bgForComboStyled, GRADIENT_STYLES, type GradientStyleName } from "@/lib/gradientStyles";
import { ALL_TEXTURES, getTextureBackground, type TextureName } from "@/lib/textures";
import { DEFAULT_SEAT_COMBOS } from "@/lib/tracker-logic";
import type { Player } from "./types";

interface BgPreset {
  key: string;
  combo: import("@/lib/themePalettes").ColorKey[];
  bg: string;
}

interface ColorPickerOverlayProps {
  playerIndex: number;
  player: Player;
  palette: Palette;
  defaultGradient: GradientStyleName;
  defaultTexture: TextureName;
  BG_PRESETS: BgPreset[];
  updatePlayer: (idx: number, updater: (p: Player) => Player) => void;
  onClose: () => void;
}

// Determine the right CSS property for a color value that may be a
// hex, rgb(), or a `linear-gradient(...)` expression.
function backgroundStyle(bg: string): React.CSSProperties {
  return { background: bg };
}

export function ColorPickerOverlay({
  playerIndex,
  player,
  palette,
  defaultGradient,
  BG_PRESETS,
  defaultTexture,
  updatePlayer,
  onClose,
}: ColorPickerOverlayProps) {
  return (
    <div
      className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-surface rounded-lg p-4 max-w-sm w-full space-y-3 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-semibold text-text-primary">Pick a color</h3>
        <div className="grid grid-cols-6 gap-2 max-h-80 overflow-y-auto">
          {BG_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => {
                updatePlayer(playerIndex, (p) => {
                  const combo = preset.combo.length > 0 ? preset.combo : [];
                  return { ...p, bgColor: bgForComboStyled(combo, palette, p.gradientStyle ?? defaultGradient), colorCombo: combo };
                });
                onClose();
              }}
              className="w-full aspect-square rounded-lg border border-border flex items-end justify-center text-[10px] font-bold p-0.5"
              style={backgroundStyle(preset.bg)}
              aria-label={preset.key}
            >
              <span className="px-1 rounded bg-black/40 text-white">{preset.key}</span>
            </button>
          ))}
        </div>
        <div>
          <label className="text-sm text-text-tertiary block mb-1">Custom:</label>
          <input
            type="color"
            value={
              player.bgColor.startsWith("#")
                ? player.bgColor
                : "#000000"
            }
            onChange={(e) => {
              const v = e.target.value;
              updatePlayer(playerIndex, (p) => ({ ...p, bgColor: v, colorCombo: null }));
            }}
            className="w-full h-10 rounded cursor-pointer"
          />
        </div>
        {player.colorCombo && player.colorCombo.length > 1 && (() => {
          const n = player.colorCombo!.length;
          const eligible = GRADIENT_STYLES.filter((s) => {
            if (s.minColors && n < s.minColors) return false;
            if (s.maxColors && n > s.maxColors) return false;
            return true;
          });
          const gradients = eligible.filter((s) => !s.isPattern);
          const gradientPatterns = eligible.filter((s) => s.isPattern);
          const renderButton = (style: typeof GRADIENT_STYLES[number]) => {
            const preview = style.fn(player.colorCombo!, palette);
            const isActive = (player.gradientStyle ?? defaultGradient) === style.name;
            return (
              <button
                key={style.name}
                onClick={() => {
                  updatePlayer(playerIndex, (pl) => ({
                    ...pl,
                    gradientStyle: style.name,
                    bgColor: bgForComboStyled(pl.colorCombo!, palette, style.name),
                  }));
                }}
                className={`aspect-square rounded-lg border-2 text-[8px] font-bold flex items-end justify-center pb-0.5 ${
                  isActive ? "border-accent ring-1 ring-accent" : "border-border"
                }`}
                style={{ background: preview }}
                title={style.label}
              >
                <span className="bg-black/50 text-white px-1 rounded text-[7px]">{style.label}</span>
              </button>
            );
          };
          return (
            <>
              {gradients.length > 0 && (
                <div>
                  <label className="text-sm text-text-tertiary block mb-1">Gradients:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {gradients.map(renderButton)}
                  </div>
                </div>
              )}
              {gradientPatterns.length > 0 && (
                <div>
                  <label className="text-sm text-text-tertiary block mb-1">Gradient patterns:</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {gradientPatterns.map(renderButton)}
                  </div>
                </div>
              )}
            </>
          );
        })()}
        <div>
          <label className="text-sm text-text-tertiary block mb-1">Patterns:</label>
          <div className="grid grid-cols-6 gap-1.5">
            {ALL_TEXTURES.map((t) => {
              const isActive = (player.texture ?? defaultTexture) === t.name;
              const preview = t.name === "none" ? "" : getTextureBackground(t.name, 0.4);
              return (
                <button
                  key={t.name}
                  onClick={() => {
                    updatePlayer(playerIndex, (p) => ({ ...p, texture: t.name }));
                  }}
                  className={`aspect-square rounded-lg border-2 text-[7px] font-bold flex items-end justify-center pb-0.5 ${
                    isActive ? "border-accent ring-1 ring-accent" : "border-border"
                  }`}
                  style={{
                    background: preview
                      ? `${preview}, ${player.bgColor}`
                      : player.bgColor,
                  }}
                  title={t.label}
                >
                  <span className="bg-black/50 text-white px-0.5 rounded">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const combo = DEFAULT_SEAT_COMBOS[playerIndex % DEFAULT_SEAT_COMBOS.length];
              updatePlayer(playerIndex, (p) => ({ ...p, bgColor: bgForComboStyled(combo, palette, p.gradientStyle ?? defaultGradient), colorCombo: combo, texture: defaultTexture }));
              onClose();
            }}
            className="flex-1 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium hover:bg-surface-hover"
          >
            Default color
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-accent text-accent-text font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
