import type { ColorKey } from "@/lib/themePalettes";
import type { GradientStyleName } from "@/lib/gradientStyles";

export interface Player {
  life: number;
  bgColor: string;
  colorCombo: ColorKey[] | null;
  gradientStyle: GradientStyleName;
  damage: Record<string, number>; // keys: "0", "0b" (partner), "1", "1b", etc
  userId: string;
  deckId: string;
}

export interface DeckInfo {
  id: string;
  name: string;
  commander: string;
  commander2: string | null;
  colorW: boolean;
  colorU: boolean;
  colorB: boolean;
  colorR: boolean;
  colorG: boolean;
}

export interface UserWithDecks {
  id: string;
  name: string;
  decks: DeckInfo[];
}
