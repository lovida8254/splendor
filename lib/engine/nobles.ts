import { GEM_COLORS, Noble, Player } from "./types";

/** Nobles whose bonus requirements the player currently satisfies. */
export function eligibleNobles(player: Player, nobles: Noble[]): Noble[] {
  return nobles.filter((n) => GEM_COLORS.every((c) => player.bonuses[c] >= n.requirement[c]));
}
