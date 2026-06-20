// Local match-history / stats, stored per device in localStorage.
// Works for all modes (vs AI / hotseat / online). No backend / account needed.

export type StatMode = "ai" | "hotseat" | "online";

export interface GameRecord {
  ts: number;
  mode: StatMode;
  players: number;
  names: string[];
  winner: string;
  meWon: boolean | null; // null when "me" is undefined (e.g. hotseat / spectator)
  mePrestige: number | null;
  meCards: number | null;
  meNobles: number | null;
  turns: number;
}

const KEY = "splendor:stats:v1";
const SIGKEY = "splendor:stats:sig:v1";

function ls(): Storage | null {
  return typeof localStorage !== "undefined" ? localStorage : null;
}
function readArr<T>(key: string): T[] {
  const s = ls();
  if (!s) return [];
  try {
    const raw = s.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function writeArr(key: string, arr: unknown[]) {
  ls()?.setItem(key, JSON.stringify(arr));
}

export function loadRecords(): GameRecord[] {
  return readArr<GameRecord>(KEY);
}

export function clearRecords(): void {
  const s = ls();
  if (!s) return;
  s.removeItem(KEY);
  s.removeItem(SIGKEY);
}

/** Record a finished game once (deduped by signature). Returns true if newly recorded. */
export function recordGameOnce(sig: string, rec: GameRecord): boolean {
  if (!ls()) return false;
  const sigs = readArr<string>(SIGKEY);
  if (sigs.includes(sig)) return false;
  writeArr(SIGKEY, [...sigs, sig].slice(-200));
  writeArr(KEY, [...loadRecords(), rec].slice(-300));
  return true;
}

export interface ModeStat {
  games: number;
  wins: number;
}
export interface Stats {
  games: number;
  decisive: number; // games where "me" is defined
  wins: number;
  winRate: number; // 0..1 over decisive games
  byMode: Record<StatMode, ModeStat>;
  bestPrestige: number;
  avgTurns: number;
}

export function computeStats(records: GameRecord[]): Stats {
  const byMode: Record<StatMode, ModeStat> = {
    ai: { games: 0, wins: 0 },
    hotseat: { games: 0, wins: 0 },
    online: { games: 0, wins: 0 },
  };
  let decisive = 0;
  let wins = 0;
  let bestPrestige = 0;
  let turnsSum = 0;
  for (const r of records) {
    byMode[r.mode].games++;
    if (r.meWon != null) {
      decisive++;
      if (r.meWon) {
        wins++;
        byMode[r.mode].wins++;
      }
    }
    if (r.mePrestige != null) bestPrestige = Math.max(bestPrestige, r.mePrestige);
    turnsSum += r.turns;
  }
  return {
    games: records.length,
    decisive,
    wins,
    winRate: decisive ? wins / decisive : 0,
    byMode,
    bestPrestige,
    avgTurns: records.length ? turnsSum / records.length : 0,
  };
}
