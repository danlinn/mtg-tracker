export type WinLabel = "nice" | "big" | "easy" | null;

interface PlayerWithDeck {
  isWinner: boolean;
  deck: { bracket: number | null; edhp: number | null };
}

export function getWinLabel(players: PlayerWithDeck[]): WinLabel {
  const winner = players.find((p) => p.isWinner);
  if (!winner) return null;

  const losers = players.filter((p) => !p.isWinner);
  const winBracket = winner.deck.bracket;
  const winEdhp = winner.deck.edhp;

  const maxLoserBracket = losers.reduce<number | null>((max, l) => {
    if (l.deck.bracket == null) return max;
    return max == null ? l.deck.bracket : Math.max(max, l.deck.bracket);
  }, null);
  const maxLoserEdhp = losers.reduce<number | null>((max, l) => {
    if (l.deck.edhp == null) return max;
    return max == null ? l.deck.edhp : Math.max(max, l.deck.edhp);
  }, null);

  const bracketDiff = winBracket != null && maxLoserBracket != null ? maxLoserBracket - winBracket : null;
  const edhpDiff = winEdhp != null && maxLoserEdhp != null ? maxLoserEdhp - winEdhp : null;

  if ((bracketDiff != null && bracketDiff <= -2) || (edhpDiff != null && edhpDiff <= -3.0)) {
    return "easy";
  }
  if ((bracketDiff != null && bracketDiff >= 2) || (edhpDiff != null && edhpDiff >= 3.0)) {
    return "big";
  }
  if ((bracketDiff != null && bracketDiff >= 1) || (edhpDiff != null && edhpDiff >= 1.5)) {
    return "nice";
  }

  return null;
}
