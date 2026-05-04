import type { ColorKey } from "@/lib/themePalettes";

export const DEFAULT_SEAT_COMBOS: ColorKey[][] = [["R"], ["U"], ["G"], ["B"]];

export function isAlive(player: { life: number; damage: Record<string, number> }): boolean {
  return player.life > 0 && !Object.values(player.damage).some((d) => d >= 21);
}
